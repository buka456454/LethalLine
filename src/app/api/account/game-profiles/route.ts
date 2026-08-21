import { fail, ok } from "@/lib/api";
import { readSession } from "@/lib/auth";
import { ensureCoreGames } from "@/lib/coreGames";
import { isNotPlayed, NOT_PLAYED_VALUE } from "@/lib/gameQuestionnaireConfig";
import { prisma } from "@/lib/prisma";
import { putUserGameProfilesSchema } from "@/lib/schemas";
import { adminApplicationsUrl, escapeHtml } from "@/lib/telegram/format";
import { expKeyboard } from "@/lib/telegram/keyboards";
import { notifyAdmin } from "@/lib/telegram/notify";
import { resolveLocalUploadPath } from "@/lib/telegram/resolveUpload";

function isProfileEmpty(entry: {
  mmr?: number | null;
  rankLabel?: string | null;
  hoursPlayed?: number | null;
  primaryRole?: string | null;
  experienceProofImageUrl?: string;
}) {
  const hasMmr = entry.mmr != null && entry.mmr !== undefined;
  const hasRank = entry.rankLabel != null && String(entry.rankLabel).trim() !== "";
  const hasHours = entry.hoursPlayed != null && entry.hoursPlayed !== undefined;
  const hasRole = entry.primaryRole != null && String(entry.primaryRole).trim() !== "";
  const hasProof = typeof entry.experienceProofImageUrl === "string" && entry.experienceProofImageUrl.trim() !== "";
  return !hasMmr && !hasRank && !hasHours && !hasRole && !hasProof;
}

export async function GET() {
  try {
    const session = await readSession();
    if (!session) return fail("Unauthorized", 401);

    await ensureCoreGames();
    const games = await prisma.game.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        iconUrl: true,
      },
    });

    const profiles = await prisma.userGameProfile.findMany({
      where: { userId: session.sub },
    });
    const byGameId = new Map(profiles.map((p) => [p.gameId, p]));

    return ok({
      games: games.map((g) => {
        const p = byGameId.get(g.id);
        return {
          game: g,
          profile: p
            ? {
                mmr: p.mmr,
                rankLabel: p.rankLabel,
                hoursPlayed: p.hoursPlayed,
                primaryRole: p.primaryRole,
                experienceVerificationStatus: p.experienceVerificationStatus,
                experienceProofImageUrl: p.experienceProofImageUrl,
                experienceProofSubmittedAt: p.experienceProofSubmittedAt,
                experienceVerificationReviewedAt: p.experienceVerificationReviewedAt,
                experienceVerificationNote: p.experienceVerificationNote,
              }
            : null,
        };
      }),
    });
  } catch {
    return fail("Не удалось загрузить анкету. Проверьте миграции БД (UserGameProfile).", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await readSession();
    if (!session) return fail("Unauthorized", 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Invalid JSON body", 422);
    }
    const parsed = putUserGameProfilesSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid game profiles payload", 422);

    await ensureCoreGames();
    const validGameIds = new Set((await prisma.game.findMany({ select: { id: true } })).map((g) => g.id));

    for (const row of parsed.data.profiles) {
      if (!validGameIds.has(row.gameId)) return fail("Unknown game id", 422);
    }

    const userId = session.sub;
    const pendingProofGameIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const row of parsed.data.profiles) {
        // «Нет опыта» — самодостаточный ответ: ранг, часы, роль и скриншот к нему не применимы.
        const notPlayed = isNotPlayed(row.rankLabel);
        const proofRaw = notPlayed ? undefined : row.experienceProofImageUrl?.trim();
        const hasProofPayload = notPlayed || row.experienceProofImageUrl !== undefined;
        const hasProofValue = Boolean(proofRaw);

        if (isProfileEmpty(row)) {
          await tx.userGameProfile.deleteMany({
            where: { userId, gameId: row.gameId },
          });
          continue;
        }

        if (hasProofValue) pendingProofGameIds.push(row.gameId);

        await tx.userGameProfile.upsert({
          where: { userId_gameId: { userId, gameId: row.gameId } },
          create: {
            userId,
            gameId: row.gameId,
            mmr: notPlayed ? null : row.mmr ?? null,
            rankLabel: notPlayed ? NOT_PLAYED_VALUE : row.rankLabel?.trim() || null,
            hoursPlayed: notPlayed ? null : row.hoursPlayed ?? null,
            primaryRole: notPlayed ? null : row.primaryRole?.trim() || null,
            experienceVerificationStatus: hasProofValue ? "PENDING" : "NOT_SUBMITTED",
            experienceProofImageUrl: hasProofValue ? proofRaw : null,
            experienceProofSubmittedAt: hasProofValue ? new Date() : null,
            experienceVerificationReviewedAt: null,
            experienceVerificationNote: null,
          },
          update: {
            mmr: notPlayed ? null : row.mmr ?? null,
            rankLabel: notPlayed ? NOT_PLAYED_VALUE : row.rankLabel?.trim() || null,
            hoursPlayed: notPlayed ? null : row.hoursPlayed ?? null,
            primaryRole: notPlayed ? null : row.primaryRole?.trim() || null,
            ...(hasProofPayload
              ? hasProofValue
                ? {
                    experienceVerificationStatus: "PENDING",
                    experienceProofImageUrl: proofRaw,
                    experienceProofSubmittedAt: new Date(),
                    experienceVerificationReviewedAt: null,
                    experienceVerificationNote: null,
                  }
                : {
                    experienceVerificationStatus: "NOT_SUBMITTED",
                    experienceProofImageUrl: null,
                    experienceProofSubmittedAt: null,
                    experienceVerificationReviewedAt: null,
                    experienceVerificationNote: null,
                  }
              : {}),
          },
        });
      }
    });

    if (pendingProofGameIds.length > 0) {
      const pendingProfiles = await prisma.userGameProfile.findMany({
        where: {
          userId,
          gameId: { in: pendingProofGameIds },
          experienceVerificationStatus: "PENDING",
        },
        include: { game: { select: { name: true } } },
      });
      for (const profile of pendingProfiles) {
        void notifyAdmin(
          [
            `<b>Experience proof</b>`,
            `Игрок: <b>@${escapeHtml(session.username)}</b>`,
            `Игра: ${escapeHtml(profile.game.name)}`,
            `<a href="${adminApplicationsUrl()}">Админка</a>`,
          ].join("\n"),
          {
            reply_markup: expKeyboard(profile.id),
            photoPath: resolveLocalUploadPath(profile.experienceProofImageUrl),
          },
        );
      }
    }

    return ok({ ok: true });
  } catch {
    return fail("Не удалось сохранить анкету. Проверьте миграции БД (UserGameProfile).", 500);
  }
}
