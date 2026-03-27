import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";
import { requireAuth } from "@/lib/guards";
import { PaymentProvider, PaymentStatus, TournamentStatus } from "@prisma/client";
import { getTBankConfigFromEnv, tbankInitPayment } from "@/lib/payments/tbank";

export const dynamic = "force-dynamic";

function getOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const host = request.headers.get("host");
  if (!host) return null;
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: tournamentId } = await context.params;

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) return fail("Tournament not found", 404);
    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) return fail("Registration is closed", 400);
    if (tournament.entryFeeMinor <= 0) return fail("Tournament is free", 400);

    const application = await prisma.teamApplication.findUnique({
      where: { captainId_tournamentId: { captainId: session.sub, tournamentId } },
    });
    if (!application) return fail("Team application not found", 404);
    if (application.paymentStatus === PaymentStatus.PAID) return ok({ paymentUrl: null, status: "PAID" });

    const config = getTBankConfigFromEnv();
    const origin = getOrigin(request);
    const appUrl = process.env.APP_URL ?? origin ?? null;
    if (!appUrl) return fail("Missing APP_URL", 500);

    const orderId = `ta_${application.id}_${Date.now()}`;
    const notificationUrl = process.env.TBANK_NOTIFICATION_URL ?? `${appUrl}/api/payments/tbank/webhook`;
    const successUrl = process.env.TBANK_SUCCESS_URL ?? `${appUrl}/tournaments/${tournamentId}/apply`;
    const failUrl = process.env.TBANK_FAIL_URL ?? `${appUrl}/tournaments/${tournamentId}/apply`;

    const init = await tbankInitPayment(config, {
      Amount: tournament.entryFeeMinor,
      OrderId: orderId,
      Description: `Взнос за участие: ${tournament.title} (${tournamentId})`,
      NotificationURL: notificationUrl,
      SuccessURL: successUrl,
      FailURL: failUrl,
    });

    if (!init.Success || !init.PaymentId || !init.PaymentURL) {
      return fail(init.Message ?? init.Details ?? "Failed to init payment", 502);
    }

    await prisma.teamApplication.update({
      where: { id: application.id },
      data: {
        paymentProvider: PaymentProvider.TBANK,
        paymentStatus: PaymentStatus.PENDING,
        paymentId: init.PaymentId,
        paymentOrderId: orderId,
      },
    });

    return ok({ paymentUrl: init.PaymentURL, status: "PENDING" }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Failed to init payment", 500);
  }
}

