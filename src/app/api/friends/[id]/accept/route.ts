import { FriendshipStatus } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { canAcceptFriendship } from "@/lib/friends";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const limit = rateLimit(`friend-accept:${session.sub}`, 60, 10 * 60_000);
    if (!limit.allowed) return fail("Слишком много действий. Попробуйте позже.", 429);
    const { id } = await context.params;

    const friendship = await prisma.friendship.findUnique({ where: { id } });
    if (!friendship) return fail("Заявка не найдена", 404);
    if (!canAcceptFriendship(session.sub, friendship)) {
      return fail("Принять заявку может только адресат", 403);
    }

    const updated = await prisma.friendship.update({
      where: { id },
      data: {
        status: FriendshipStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    await writeAuditLog({
      actorId: session.sub,
      action: "FRIEND_REQUEST_ACCEPTED",
      entity: "Friendship",
      entityId: updated.id,
      metadata: { requesterId: updated.requesterId },
    });

    return ok({ friendshipId: updated.id, status: updated.status, kind: "friends" as const });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Не удалось принять заявку", 500);
  }
}
