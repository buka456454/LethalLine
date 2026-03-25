import { TeamApplicationStatus } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const payloadSchema = z.object({
  status: z.enum([TeamApplicationStatus.APPROVED, TeamApplicationStatus.REJECTED]),
});

export async function PATCH(request: Request, context: { params: Promise<{ teamApplicationId: string }> }) {
  try {
    const session = await requireOwnerAdmin();
    const { teamApplicationId } = await context.params;
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid payload", 422);

    const application = await prisma.teamApplication.update({
      where: { id: teamApplicationId },
      data: { status: parsed.data.status },
      include: {
        captain: { select: { id: true, username: true } },
        tournament: { select: { id: true, title: true } },
        members: { select: { linkedUserId: true, username: true } },
      },
    });

    const memberUserIds = application.members
      .map((member) => member.linkedUserId)
      .filter((value): value is string => Boolean(value));
    const notifyUserIds = Array.from(new Set([application.captain.id, ...memberUserIds]));

    if (notifyUserIds.length > 0) {
      const message =
        parsed.data.status === TeamApplicationStatus.APPROVED
          ? `Командная заявка ${application.teamName} на турнир ${application.tournament.title} одобрена.`
          : `Командная заявка ${application.teamName} на турнир ${application.tournament.title} отклонена.`;

      await prisma.userTournamentNotification.createMany({
        data: notifyUserIds.map((userId) => ({
          userId,
          tournamentId: application.tournament.id,
          teamApplicationId: application.id,
          message,
        })),
      });
    }

    await writeAuditLog({
      actorId: session.sub,
      action: "TEAM_APPLICATION_STATUS_UPDATED",
      entity: "TeamApplication",
      entityId: application.id,
      metadata: parsed.data,
    });

    return ok({ application });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to update team application", 500);
  }
}
