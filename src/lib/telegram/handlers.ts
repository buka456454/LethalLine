import { RegistrationStatus, Role, TeamApplicationStatus } from "@prisma/client";
import { ModerationError } from "@/lib/admin/moderateRegistration";
import { moderateExperience } from "@/lib/admin/moderateExperience";
import { moderateRegistration } from "@/lib/admin/moderateRegistration";
import { moderateTeamApplication } from "@/lib/admin/moderateTeamApplication";
import { moderateUser, resolveOwnerActorId } from "@/lib/admin/moderateUser";
import { prisma } from "@/lib/prisma";
import {
  bindAdminChatId,
  getTelegramAdminUsername,
  isTelegramAdminUser,
  type TelegramUser,
} from "@/lib/telegram/acl";
import { answerCallbackQuery, editMessageText, sendMessage, sendPhoto } from "@/lib/telegram/client";
import { adminApplicationsUrl, escapeHtml, shortId } from "@/lib/telegram/format";
import { expKeyboard, regKeyboard, teamKeyboard, userKeyboard } from "@/lib/telegram/keyboards";
import { resolveLocalUploadPath } from "@/lib/telegram/resolveUpload";

type TelegramChat = { id: number; type: string };
type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  text?: string;
  from?: TelegramUser;
};
type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: TelegramMessage;
};
export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

const SOURCE = "telegram:@B6yKka";

function helpText() {
  return [
    `<b>Lethal Line Admin Bot</b>`,
    ``,
    `Доступ только для @${escapeHtml(getTelegramAdminUsername())}.`,
    ``,
    `/pending — сводка ожидающих`,
    `/apps — заявки с кнопками`,
    `/user &lt;username|id&gt; — аккаунт`,
    ``,
    `<a href="${adminApplicationsUrl()}">Админка заявок</a>`,
  ].join("\n");
}

async function denyIfNeeded(from: TelegramUser | undefined, chatId: number) {
  if (isTelegramAdminUser(from)) return false;
  await sendMessage(chatId, "Access denied.");
  return true;
}

async function handleStart(message: TelegramMessage) {
  if (await denyIfNeeded(message.from, message.chat.id)) return;
  await bindAdminChatId(message.chat.id);
  await sendMessage(message.chat.id, `Chat привязан.\n\n${helpText()}`);
}

async function handlePending(message: TelegramMessage) {
  if (await denyIfNeeded(message.from, message.chat.id)) return;

  const [regs, teams, exps] = await Promise.all([
    prisma.tournamentRegistration.count({ where: { status: RegistrationStatus.PENDING } }),
    prisma.teamApplication.count({ where: { status: TeamApplicationStatus.PENDING } }),
    prisma.userGameProfile.count({ where: { experienceVerificationStatus: "PENDING" } }),
  ]);

  await sendMessage(
    message.chat.id,
    [
      `<b>Ожидают решения</b>`,
      `Solo: <b>${regs}</b>`,
      `Team: <b>${teams}</b>`,
      `Experience: <b>${exps}</b>`,
      ``,
      `<a href="${adminApplicationsUrl()}">Открыть админку</a>`,
    ].join("\n"),
  );
}

async function handleApps(message: TelegramMessage) {
  if (await denyIfNeeded(message.from, message.chat.id)) return;

  const [regs, teams, exps] = await Promise.all([
    prisma.tournamentRegistration.findMany({
      where: { status: RegistrationStatus.PENDING },
      include: {
        user: { select: { username: true } },
        tournament: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.teamApplication.findMany({
      where: { status: TeamApplicationStatus.PENDING },
      include: {
        captain: { select: { username: true } },
        tournament: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.userGameProfile.findMany({
      where: { experienceVerificationStatus: "PENDING" },
      include: {
        user: { select: { username: true } },
        game: { select: { name: true } },
      },
      orderBy: { experienceProofSubmittedAt: "desc" },
      take: 5,
    }),
  ]);

  if (regs.length === 0 && teams.length === 0 && exps.length === 0) {
    await sendMessage(message.chat.id, "Нет ожидающих заявок.");
    return;
  }

  const jobs: Promise<unknown>[] = [];

  for (const reg of regs) {
    jobs.push(
      sendMessage(
        message.chat.id,
        [
          `<b>Solo заявка</b> (${escapeHtml(shortId(reg.id))})`,
          `Игрок: <b>${escapeHtml(reg.user.username)}</b>`,
          `Турнир: ${escapeHtml(reg.tournament.title)}`,
        ].join("\n"),
        { reply_markup: regKeyboard(reg.id) },
      ),
    );
  }

  for (const team of teams) {
    jobs.push(
      sendMessage(
        message.chat.id,
        [
          `<b>Team заявка</b> (${escapeHtml(shortId(team.id))})`,
          `Команда: <b>${escapeHtml(team.teamName)}</b>`,
          `Капитан: ${escapeHtml(team.captain.username)}`,
          `Турнир: ${escapeHtml(team.tournament.title)}`,
          `Оплата: ${escapeHtml(team.paymentStatus)}`,
        ].join("\n"),
        { reply_markup: teamKeyboard(team.id) },
      ),
    );
  }

  for (const exp of exps) {
    const caption = [
      `<b>Experience</b> (${escapeHtml(shortId(exp.id))})`,
      `Игрок: <b>${escapeHtml(exp.user.username)}</b>`,
      `Игра: ${escapeHtml(exp.game.name)}`,
    ].join("\n");
    const photoPath = resolveLocalUploadPath(exp.experienceProofImageUrl);
    jobs.push(
      photoPath
        ? sendPhoto(message.chat.id, photoPath, caption, { reply_markup: expKeyboard(exp.id) }).then(
            (sent) =>
              sent ??
              sendMessage(message.chat.id, caption, { reply_markup: expKeyboard(exp.id) }),
          )
        : sendMessage(message.chat.id, caption, { reply_markup: expKeyboard(exp.id) }),
    );
  }

  await Promise.all(jobs);
}

async function handleUser(message: TelegramMessage, query: string) {
  if (await denyIfNeeded(message.from, message.chat.id)) return;

  const q = query.trim();
  if (!q) {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        isBanned: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    if (users.length === 0) {
      await sendMessage(message.chat.id, "Пользователей пока нет.");
      return;
    }

    const header = [
      `<b>Игроки</b> (показано ${users.length}${users.length >= 300 ? "+" : ""})`,
      `Карточка: <code>/user ник</code>`,
      "",
    ].join("\n");

    const lines = users.map((user, index) => {
      const ban = user.isBanned ? " 🚫" : "";
      return `${index + 1}. @${escapeHtml(user.username)} · ${escapeHtml(user.role)}${ban}`;
    });

    const chunks: string[] = [];
    let current = header;
    for (const line of lines) {
      const next = `${current}\n${line}`;
      if (next.length > 3500) {
        chunks.push(current);
        current = line;
      } else {
        current = next;
      }
    }
    if (current.trim()) chunks.push(current);

    await Promise.all(chunks.map((chunk) => sendMessage(message.chat.id, chunk)));
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: q }, { username: { equals: q.replace(/^@/, ""), mode: "insensitive" } }],
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isBanned: true,
      banReason: true,
      createdAt: true,
    },
  });

  if (!user) {
    await sendMessage(message.chat.id, "Пользователь не найден.");
    return;
  }

  await sendMessage(
    message.chat.id,
    [
      `<b>@${escapeHtml(user.username)}</b>`,
      `id: <code>${escapeHtml(user.id)}</code>`,
      `email: ${escapeHtml(user.email)}`,
      `role: <b>${escapeHtml(user.role)}</b>`,
      `banned: <b>${user.isBanned ? "yes" : "no"}</b>${user.banReason ? ` (${escapeHtml(user.banReason)})` : ""}`,
      `created: ${escapeHtml(user.createdAt.toISOString())}`,
    ].join("\n"),
    { reply_markup: userKeyboard(user.id, user.isBanned) },
  );
}

async function handleCallback(query: TelegramCallbackQuery) {
  const chatId = query.message?.chat.id;
  if (!chatId) {
    await answerCallbackQuery(query.id, "No chat");
    return;
  }

  if (!isTelegramAdminUser(query.from)) {
    await answerCallbackQuery(query.id, "Access denied");
    return;
  }

  const data = query.data?.trim() ?? "";
  if (!data) {
    await answerCallbackQuery(query.id);
    return;
  }

  try {
    const actorId = await resolveOwnerActorId();
    const parts = data.split(":");

    if (parts[0] === "reg" && parts[1] && parts[2]) {
      const status =
        parts[1] === "approve" ? RegistrationStatus.APPROVED : RegistrationStatus.REJECTED;
      const reg = await moderateRegistration({
        registrationId: parts[2],
        status,
        actorId,
        source: SOURCE,
      });
      await answerCallbackQuery(query.id, status === RegistrationStatus.APPROVED ? "Approved" : "Rejected");
      if (query.message) {
        await editMessageText(
          chatId,
          query.message.message_id,
          [
            `<b>Solo заявка</b> — <b>${status}</b>`,
            `Игрок: ${escapeHtml(reg.user.username)}`,
            `Турнир: ${escapeHtml(reg.tournament.title)}`,
          ].join("\n"),
        );
      }
      return;
    }

    if (parts[0] === "team" && parts[1] && parts[2]) {
      const status =
        parts[1] === "approve" ? TeamApplicationStatus.APPROVED : TeamApplicationStatus.REJECTED;
      const app = await moderateTeamApplication({
        teamApplicationId: parts[2],
        status,
        actorId,
        source: SOURCE,
      });
      await answerCallbackQuery(query.id, status === TeamApplicationStatus.APPROVED ? "Approved" : "Rejected");
      if (query.message) {
        await editMessageText(
          chatId,
          query.message.message_id,
          [
            `<b>Team заявка</b> — <b>${status}</b>`,
            `Команда: ${escapeHtml(app.teamName)}`,
            `Капитан: ${escapeHtml(app.captain.username)}`,
            `Турнир: ${escapeHtml(app.tournament.title)}`,
          ].join("\n"),
        );
      }
      return;
    }

    if (parts[0] === "exp" && parts[1] && parts[2]) {
      const status = parts[1] === "approve" ? "APPROVED" : "REJECTED";
      const profile = await moderateExperience({
        profileId: parts[2],
        status,
        actorId,
        source: SOURCE,
      });
      await answerCallbackQuery(query.id, status === "APPROVED" ? "Approved" : "Rejected");
      if (query.message) {
        await editMessageText(
          chatId,
          query.message.message_id,
          [
            `<b>Experience</b> — <b>${status}</b>`,
            `Игрок: ${escapeHtml(profile.user.username)}`,
            `Игра: ${escapeHtml(profile.game.name)}`,
          ].join("\n"),
        );
      }
      return;
    }

    if (parts[0] === "user" && parts[1] === "ban" && parts[2]) {
      const user = await moderateUser({
        userId: parts[2],
        isBanned: true,
        banReason: "Banned via Telegram",
        actorId,
        source: SOURCE,
      });
      await answerCallbackQuery(query.id, "Banned");
      if (query.message) {
        await editMessageText(
          chatId,
          query.message.message_id,
          `Пользователь <b>@${escapeHtml(user.username)}</b> забанен.`,
          { reply_markup: userKeyboard(user.id, true) },
        );
      }
      return;
    }

    if (parts[0] === "user" && parts[1] === "unban" && parts[2]) {
      const user = await moderateUser({
        userId: parts[2],
        isBanned: false,
        banReason: null,
        actorId,
        source: SOURCE,
      });
      await answerCallbackQuery(query.id, "Unbanned");
      if (query.message) {
        await editMessageText(
          chatId,
          query.message.message_id,
          `Пользователь <b>@${escapeHtml(user.username)}</b> разбанен.`,
          { reply_markup: userKeyboard(user.id, false) },
        );
      }
      return;
    }

    if (parts[0] === "user" && parts[1] === "role" && parts[2] && parts[3]) {
      const role = parts[3] === "ADMIN" ? Role.ADMIN : Role.USER;
      const user = await moderateUser({
        userId: parts[2],
        role,
        actorId,
        source: SOURCE,
      });
      await answerCallbackQuery(query.id, `Role → ${role}`);
      if (query.message) {
        await editMessageText(
          chatId,
          query.message.message_id,
          [
            `<b>@${escapeHtml(user.username)}</b>`,
            `role: <b>${escapeHtml(user.role)}</b>`,
            `banned: <b>${user.isBanned ? "yes" : "no"}</b>`,
          ].join("\n"),
          { reply_markup: userKeyboard(user.id, user.isBanned) },
        );
      }
      return;
    }

    await answerCallbackQuery(query.id, "Unknown action");
  } catch (error) {
    const text = error instanceof ModerationError ? error.message : "Action failed";
    await answerCallbackQuery(query.id, text.slice(0, 180));
    if (error instanceof ModerationError === false) {
      console.error("[telegram] callback error:", error);
    }
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    await handleCallback(update.callback_query);
    return;
  }

  const message = update.message;
  if (!message?.text) return;

  const text = message.text.trim();
  const [commandRaw, ...rest] = text.split(/\s+/);
  const command = (commandRaw ?? "").split("@")[0]?.toLowerCase() ?? "";

  if (command === "/start") {
    await handleStart(message);
    return;
  }
  if (command === "/pending") {
    await handlePending(message);
    return;
  }
  if (command === "/apps") {
    await handleApps(message);
    return;
  }
  if (command === "/user") {
    await handleUser(message, rest.join(" "));
    return;
  }
  if (command === "/help") {
    if (await denyIfNeeded(message.from, message.chat.id)) return;
    await sendMessage(message.chat.id, helpText());
  }
}
