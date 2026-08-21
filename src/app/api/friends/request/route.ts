import { FriendshipStatus } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getFriendshipBetween, validateFriendRequest } from "@/lib/friends";
import { escapeHtml } from "@/lib/telegram/format";
import { notifyAdmin } from "@/lib/telegram/notify";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const limit = rateLimit(`friend-request:${session.sub}`, 20, 10 * 60_000);
    if (!limit.allowed) return fail("Слишком много заявок. Попробуйте позже.", 429);

    const body = (await request.json()) as { userId?: unknown };
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const validationError = validateFriendRequest(session.sub, userId);
    if (validationError) return fail(validationError, 422);

    const target = await prisma.user.findFirst({
      where: { id: userId, isBanned: false },
      select: { id: true, username: true },
    });
    if (!target) return fail("Пользователь не найден", 404);

    const existing = await getFriendshipBetween(session.sub, userId);
    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        return fail("Вы уже друзья", 409);
      }
      if (existing.requesterId === session.sub) {
        return fail("Заявка уже отправлена", 409);
      }
      return fail("Этот пользователь уже отправил вам заявку. Примите её во вкладке «Входящие».", 409);
    }

    const friendship = await prisma.friendship.create({
      data: {
        requesterId: session.sub,
        addresseeId: userId,
        status: FriendshipStatus.PENDING,
      },
    });

    await writeAuditLog({
      actorId: session.sub,
      action: "FRIEND_REQUEST_SENT",
      entity: "Friendship",
      entityId: friendship.id,
      metadata: { addresseeId: userId, username: target.username },
    });

    void notifyAdmin(
      [
        `<b>Запрос в друзья</b>`,
        `От: @${escapeHtml(session.username)}`,
        `Кому: @${escapeHtml(target.username)}`,
      ].join("\n"),
    );

    return ok({
      friendshipId: friendship.id,
      status: friendship.status,
      kind: "outgoing" as const,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Не удалось отправить заявку", 500);
  }
}
