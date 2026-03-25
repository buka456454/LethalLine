import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { updateMatchSchema } from "@/lib/schemas";

export async function PATCH(request: Request, context: { params: Promise<{ matchId: string }> }) {
  try {
    const session = await requireOwnerAdmin();
    const { matchId } = await context.params;
    const parsed = updateMatchSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid payload", 422);

    const match = await prisma.match.update({
      where: { id: matchId },
      data: parsed.data,
    });

    await writeAuditLog({
      actorId: session.sub,
      action: "MATCH_UPDATED",
      entity: "Match",
      entityId: match.id,
      metadata: parsed.data,
    });

    return ok({ match });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to update match", 500);
  }
}
