import { RegistrationStatus } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { reseedTournamentBracket } from "@/lib/bracket-seeding";
import { prisma } from "@/lib/prisma";

export class ModerationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ModerationError";
    this.status = status;
  }
}

export async function moderateRegistration(params: {
  registrationId: string;
  status: typeof RegistrationStatus.APPROVED | typeof RegistrationStatus.REJECTED;
  actorId: string;
  source?: string;
}) {
  const registration = await prisma.tournamentRegistration.update({
    where: { id: params.registrationId },
    data: { status: params.status },
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
        params.status === RegistrationStatus.APPROVED
          ? `Ваша заявка на турнир ${registration.tournament.title} одобрена.`
          : `Ваша заявка на турнир ${registration.tournament.title} отклонена.`,
    },
  });

  if (params.status === RegistrationStatus.APPROVED) {
    await reseedTournamentBracket(registration.tournament.id);
  }

  await writeAuditLog({
    actorId: params.actorId,
    action: "REGISTRATION_STATUS_UPDATED",
    entity: "TournamentRegistration",
    entityId: registration.id,
    metadata: { status: params.status, source: params.source ?? "admin_api" },
  });

  return registration;
}
