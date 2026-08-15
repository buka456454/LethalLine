import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { canDeclineFriendship } from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    const friendship = await prisma.friendship.findUnique({ where: { id } });
    if (!friendship) return fail("Заявка не найдена", 404);
    if (!canDeclineFriendship(session.sub, friendship)) {
      return fail("Отклонить заявку может только адресат", 403);
    }

    await prisma.friendship.delete({ where: { id } });

    await writeAuditLog({
      actorId: session.sub,
      action: "FRIEND_REQUEST_DECLINED",
      entity: "Friendship",
      entityId: id,
      metadata: { requesterId: friendship.requesterId },
    });

    return ok({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Не удалось отклонить заявку", 500);
  }
}
