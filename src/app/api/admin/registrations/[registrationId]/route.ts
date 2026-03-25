import { RegistrationStatus } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const payloadSchema = z.object({
  status: z.enum([RegistrationStatus.APPROVED, RegistrationStatus.REJECTED]),
});

export async function PATCH(request: Request, context: { params: Promise<{ registrationId: string }> }) {
  try {
    const session = await requireOwnerAdmin();
    const { registrationId } = await context.params;
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid payload", 422);

    const registration = await prisma.tournamentRegistration.update({
      where: { id: registrationId },
      data: { status: parsed.data.status },
      include: {
        user: { select: { id: true, username: true } },
        tournament: { select: { id: true, title: true } },
      },
    });

    await prisma.userTournamentNotification.create({
      data: {
        userId: registration.user.id,
        tournamentId: registration.tournament.id,
        message:
          parsed.data.status === RegistrationStatus.APPROVED
            ? `Ваша заявка на турнир ${registration.tournament.title} одобрена.`
            : `Ваша заявка на турнир ${registration.tournament.title} отклонена.`,
      },
    });

    await writeAuditLog({
      actorId: session.sub,
      action: "REGISTRATION_STATUS_UPDATED",
      entity: "TournamentRegistration",
      entityId: registration.id,
      metadata: parsed.data,
    });

    return ok({ registration });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to update registration", 500);
  }
}
