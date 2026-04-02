import { fail, ok } from "@/lib/api";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizePair(leftId: string, rightId: string) {
  return leftId < rightId ? [leftId, rightId] as const : [rightId, leftId] as const;
}

export async function GET() {
  try {
    const session = await readSession();
    if (!session) return fail("Unauthorized", 401);

    const dialogs = await prisma.chatDialog.findMany({
      where: {
        OR: [{ participantAId: session.sub }, { participantBId: session.sub }],
      },
      include: {
        participantA: { select: { id: true, username: true, role: true, displayName: true, avatarUrl: true } },
        participantB: { select: { id: true, username: true, role: true, displayName: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, body: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    const unreadCounts = dialogs.length
      ? await prisma.chatMessage.groupBy({
          by: ["dialogId"],
          where: {
            dialogId: { in: dialogs.map((d) => d.id) },
            readAt: null,
            senderId: { not: session.sub },
          },
          _count: { _all: true },
        })
      : [];
    const unreadMap = new Map(unreadCounts.map((i) => [i.dialogId, i._count._all]));

    return ok({
      dialogs: dialogs.map((d) => {
        const peer = d.participantAId === session.sub ? d.participantB : d.participantA;
        const lastMessage = d.messages[0] ?? null;
        return {
          id: d.id,
          peer,
          updatedAt: d.updatedAt,
          unreadCount: unreadMap.get(d.id) ?? 0,
          lastMessage,
        };
      }),
    });
  } catch {
    return fail("Не удалось загрузить диалоги. Проверьте миграции и prisma generate.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await readSession();
    if (!session) return fail("Unauthorized", 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Invalid JSON body", 422);
    }
    const peerUserId = typeof (body as { peerUserId?: unknown })?.peerUserId === "string"
      ? (body as { peerUserId: string }).peerUserId.trim()
      : "";
    if (!peerUserId) return fail("peerUserId is required", 422);
    if (peerUserId === session.sub) return fail("Нельзя создать диалог с самим собой", 422);

    const peer = await prisma.user.findFirst({
      where: { id: peerUserId, isBanned: false },
      select: { id: true },
    });
    if (!peer) return fail("Пользователь не найден", 404);

    const [participantAId, participantBId] = normalizePair(session.sub, peerUserId);
    const dialog = await prisma.chatDialog.upsert({
      where: { participantAId_participantBId: { participantAId, participantBId } },
      create: { participantAId, participantBId },
      update: {},
      select: { id: true },
    });

    return ok({ dialogId: dialog.id });
  } catch {
    return fail("Не удалось создать диалог. Проверьте миграции и prisma generate.", 500);
  }
}
