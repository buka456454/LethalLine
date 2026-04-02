import { fail, ok } from "@/lib/api";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishChatEvents } from "@/lib/chatRealtime";

const MAX_MESSAGE_LEN = 1200;

async function getDialogIfMember(dialogId: string, userId: string) {
  return prisma.chatDialog.findFirst({
    where: {
      id: dialogId,
      OR: [{ participantAId: userId }, { participantBId: userId }],
    },
    select: { id: true, participantAId: true, participantBId: true },
  });
}

export async function GET(request: Request) {
  const session = await readSession();
  if (!session) return fail("Unauthorized", 401);

  const dialogId = new URL(request.url).searchParams.get("dialogId")?.trim();
  if (!dialogId) return fail("dialogId is required", 422);

  const dialog = await getDialogIfMember(dialogId, session.sub);
  if (!dialog) return fail("Диалог не найден", 404);

  await prisma.chatMessage.updateMany({
    where: {
      dialogId,
      senderId: { not: session.sub },
      readAt: null,
    },
    data: {
      readAt: new Date(),
      readById: session.sub,
    },
  });

  const messages = await prisma.chatMessage.findMany({
    where: { dialogId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      body: true,
      senderId: true,
      createdAt: true,
      readAt: true,
    },
  });

  return ok({ messages });
}

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return fail("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 422);
  }
  const dialogId = typeof (body as { dialogId?: unknown })?.dialogId === "string"
    ? (body as { dialogId: string }).dialogId.trim()
    : "";
  const text = typeof (body as { body?: unknown })?.body === "string"
    ? (body as { body: string }).body.trim()
    : "";

  if (!dialogId) return fail("dialogId is required", 422);
  if (!text) return fail("Сообщение не может быть пустым", 422);
  if (text.length > MAX_MESSAGE_LEN) return fail(`Сообщение слишком длинное (макс ${MAX_MESSAGE_LEN})`, 422);

  const dialog = await getDialogIfMember(dialogId, session.sub);
  if (!dialog) return fail("Диалог не найден", 404);

  const created = await prisma.$transaction(async (tx) => {
    const message = await tx.chatMessage.create({
      data: { dialogId, senderId: session.sub, body: text },
      select: { id: true, dialogId: true, senderId: true, body: true, createdAt: true, readAt: true },
    });
    await tx.chatDialog.update({
      where: { id: dialogId },
      data: { updatedAt: new Date() },
    });
    return message;
  });

  publishChatEvents([dialog.participantAId, dialog.participantBId], { type: "message_created", dialogId });

  return ok({ message: created }, 201);
}
