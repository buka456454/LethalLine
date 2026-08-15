import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { canDeleteFriendship } from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    const friendship = await prisma.friendship.findUnique({ where: { id } });
    if (!friendship) return fail("Запись не найдена", 404);
    if (!canDeleteFriendship(session.sub, friendship)) {
      return fail("Недостаточно прав", 403);
    }

    await prisma.friendship.delete({ where: { id } });

    await writeAuditLog({
      actorId: session.sub,
      action: friendship.status === "ACCEPTED" ? "FRIENDSHIP_REMOVED" : "FRIEND_REQUEST_CANCELLED",
      entity: "Friendship",
      entityId: id,
      metadata: {
        requesterId: friendship.requesterId,
        addresseeId: friendship.addresseeId,
        status: friendship.status,
      },
    });

    return ok({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Не удалось удалить", 500);
  }
}
