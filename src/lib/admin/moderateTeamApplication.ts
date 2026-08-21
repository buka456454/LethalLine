import { PaymentStatus, TeamApplicationStatus } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { reseedTournamentBracket } from "@/lib/bracket-seeding";
import { ModerationError } from "@/lib/admin/moderateRegistration";
import { getTBankConfigFromEnv, tbankCancelPayment } from "@/lib/payments/tbank";
import { prisma } from "@/lib/prisma";

export async function moderateTeamApplication(params: {
  teamApplicationId: string;
  status: typeof TeamApplicationStatus.APPROVED | typeof TeamApplicationStatus.REJECTED;
  actorId: string;
  source?: string;
}) {
  const existing = await prisma.teamApplication.findUnique({
    where: { id: params.teamApplicationId },
    include: {
      captain: { select: { id: true, username: true } },
      tournament: { select: { id: true, title: true, entryFeeMinor: true } },
      members: { select: { linkedUserId: true, username: true } },
    },
  });
  if (!existing) throw new ModerationError("Team application not found", 404);

  const isPaidTournament = existing.tournament.entryFeeMinor > 0;
  if (
    params.status === TeamApplicationStatus.APPROVED &&
    isPaidTournament &&
    existing.paymentStatus !== PaymentStatus.PAID
  ) {
    throw new ModerationError("Payment required", 400);
  }

  const application = await prisma.teamApplication.update({
    where: { id: params.teamApplicationId },
    data: { status: params.status },
    include: {
      captain: { select: { id: true, username: true } },
      tournament: { select: { id: true, title: true, entryFeeMinor: true } },
      members: { select: { linkedUserId: true, username: true } },
    },
  });

  if (
    params.status === TeamApplicationStatus.REJECTED &&
    isPaidTournament &&
    application.paymentStatus === PaymentStatus.PAID
  ) {
    if (!application.paymentId) {
      await prisma.teamApplication.update({
        where: { id: application.id },
        data: {
          paymentStatus: PaymentStatus.REFUND_FAILED,
          refundReason: "Missing paymentId for refund",
        },
      });
    } else {
      await prisma.teamApplication.update({
        where: { id: application.id },
        data: { paymentStatus: PaymentStatus.REFUND_PENDING },
      });

      const config = getTBankConfigFromEnv();
      const refund = await tbankCancelPayment(config, {
        PaymentId: application.paymentId,
        Amount: application.tournament.entryFeeMinor,
      });

      await prisma.teamApplication.update({
        where: { id: application.id },
        data: refund.Success
          ? {
              paymentStatus: PaymentStatus.REFUNDED,
              refundId: refund.PaymentId ?? null,
              refundedAt: new Date(),
              refundReason: null,
            }
          : {
              paymentStatus: PaymentStatus.REFUND_FAILED,
              refundId: refund.PaymentId ?? null,
              refundReason: refund.Message ?? refund.Details ?? `ErrorCode=${refund.ErrorCode}`,
            },
      });
    }
  }

  const memberUserIds = application.members
    .map((member) => member.linkedUserId)
    .filter((value): value is string => Boolean(value));
  const notifyUserIds = Array.from(new Set([application.captain.id, ...memberUserIds]));

  if (notifyUserIds.length > 0) {
    let message =
      params.status === TeamApplicationStatus.APPROVED
        ? `Командная заявка ${application.teamName} на турнир ${application.tournament.title} одобрена.`
        : `Командная заявка ${application.teamName} на турнир ${application.tournament.title} отклонена.`;

    if (params.status === TeamApplicationStatus.REJECTED && isPaidTournament) {
      const fresh = await prisma.teamApplication.findUnique({
        where: { id: application.id },
        select: { paymentStatus: true, refundReason: true },
      });
      if (fresh?.paymentStatus === PaymentStatus.REFUNDED) {
        message = `${message} Возврат средств выполнен автоматически.`;
      } else if (fresh?.paymentStatus === PaymentStatus.REFUND_FAILED) {
        message = `${message} Возврат средств не удался автоматически: ${fresh.refundReason ?? "неизвестная ошибка"}.`;
      } else if (fresh?.paymentStatus === PaymentStatus.REFUND_PENDING) {
        message = `${message} Возврат средств в процессе.`;
      }
    }

    await prisma.userTournamentNotification.createMany({
      data: notifyUserIds.map((userId) => ({
        userId,
        tournamentId: application.tournament.id,
        teamApplicationId: application.id,
        message,
      })),
    });
  }

  if (params.status === TeamApplicationStatus.APPROVED) {
    await reseedTournamentBracket(application.tournament.id);
  }

  await writeAuditLog({
    actorId: params.actorId,
    action: "TEAM_APPLICATION_STATUS_UPDATED",
    entity: "TeamApplication",
    entityId: application.id,
    metadata: { status: params.status, source: params.source ?? "admin_api" },
  });

  return application;
}
