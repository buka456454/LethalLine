import { PaymentStatus, TeamApplicationStatus } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getTBankConfigFromEnv, tbankCancelPayment } from "@/lib/payments/tbank";
import { reseedTournamentBracket } from "@/lib/bracket-seeding";

const payloadSchema = z.object({
  status: z.enum([TeamApplicationStatus.APPROVED, TeamApplicationStatus.REJECTED]),
});

export async function PATCH(request: Request, context: { params: Promise<{ teamApplicationId: string }> }) {
  try {
    const session = await requireOwnerAdmin();
    const { teamApplicationId } = await context.params;
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid payload", 422);

    const existing = await prisma.teamApplication.findUnique({
      where: { id: teamApplicationId },
      include: {
        captain: { select: { id: true, username: true } },
        tournament: { select: { id: true, title: true, entryFeeMinor: true } },
        members: { select: { linkedUserId: true, username: true } },
      },
    });
    if (!existing) return fail("Team application not found", 404);

    const isPaidTournament = existing.tournament.entryFeeMinor > 0;
    if (parsed.data.status === TeamApplicationStatus.APPROVED && isPaidTournament && existing.paymentStatus !== PaymentStatus.PAID) {
      return fail("Payment required", 400);
    }

    const application = await prisma.teamApplication.update({
      where: { id: teamApplicationId },
      data: { status: parsed.data.status },
      include: {
        captain: { select: { id: true, username: true } },
        tournament: { select: { id: true, title: true, entryFeeMinor: true } },
        members: { select: { linkedUserId: true, username: true } },
      },
    });

    if (parsed.data.status === TeamApplicationStatus.REJECTED && isPaidTournament && application.paymentStatus === PaymentStatus.PAID) {
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
        parsed.data.status === TeamApplicationStatus.APPROVED
          ? `Командная заявка ${application.teamName} на турнир ${application.tournament.title} одобрена.`
          : `Командная заявка ${application.teamName} на турнир ${application.tournament.title} отклонена.`;

      if (parsed.data.status === TeamApplicationStatus.REJECTED && isPaidTournament) {
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

    if (parsed.data.status === TeamApplicationStatus.APPROVED) {
      await reseedTournamentBracket(application.tournament.id);
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
