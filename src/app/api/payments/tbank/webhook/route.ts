import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api";
import { PaymentProvider, PaymentStatus, Prisma, Role } from "@prisma/client";
import { getTBankConfigFromEnv, type TBankNotificationPayment, verifyTBankNotificationToken } from "@/lib/payments/tbank";

export const dynamic = "force-dynamic";

function normalizeSuccess(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

export async function POST(request: Request) {
  const config = getTBankConfigFromEnv();
  const body = (await request.json()) as TBankNotificationPayment;

  const isValid = verifyTBankNotificationToken(body, config.password);
  if (!isValid) return fail("Invalid token", 401);

  const success = normalizeSuccess(body.Success);
  const status = typeof body.Status === "string" ? body.Status : "";
  const paymentId = typeof body.PaymentId === "string" ? body.PaymentId : "";
  const orderId = typeof body.OrderId === "string" ? body.OrderId : "";
  const amount = typeof body.Amount === "number" ? body.Amount : typeof body.Amount === "string" ? Number(body.Amount) : undefined;

  if (!paymentId && !orderId) return fail("Missing payment identifiers", 422);

  const or: Prisma.TeamApplicationWhereInput[] = [];
  if (paymentId) or.push({ paymentId });
  if (orderId) or.push({ paymentOrderId: orderId });

  // Find application by stored ids; prefer PaymentId when available
  const application = await prisma.teamApplication.findFirst({
    where: {
      OR: or,
    },
    include: { tournament: true },
  });

  if (!application) {
    // acknowledge to stop retries, but don't leak
    return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  // Validate amount when tournament is paid
  if (application.tournament.entryFeeMinor > 0 && typeof amount === "number" && amount !== application.tournament.entryFeeMinor) {
    return fail("Invalid amount", 422);
  }

  if (!success) {
    await prisma.teamApplication.update({
      where: { id: application.id },
      data: {
        paymentProvider: PaymentProvider.TBANK,
        paymentId: paymentId || application.paymentId,
        paymentOrderId: orderId || application.paymentOrderId,
        paymentStatus: application.paymentStatus === PaymentStatus.PAID ? PaymentStatus.PAID : PaymentStatus.UNPAID,
      },
    });
    return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  // For one-stage payments T-Bank may send AUTHORIZED and CONFIRMED; treat CONFIRMED as paid.
  if (status === "CONFIRMED") {
    const updateRes = await prisma.teamApplication.updateMany({
      where: { id: application.id, paymentStatus: { not: PaymentStatus.PAID } },
      data: {
        paymentProvider: PaymentProvider.TBANK,
        paymentId: paymentId || application.paymentId,
        paymentOrderId: orderId || application.paymentOrderId,
        paymentStatus: PaymentStatus.PAID,
        paidAt: application.paidAt ?? new Date(),
      },
    });

    if (updateRes.count > 0) {
      const admins = await prisma.user.findMany({
        where: { role: { in: [Role.ADMIN, Role.SUPERADMIN] }, isBanned: false },
        select: { id: true },
      });

      const adminIds = admins.map((u) => u.id);
      const notifyIds = Array.from(new Set([application.captainId, ...adminIds]));

      if (notifyIds.length > 0) {
        await prisma.userTournamentNotification.createMany({
          data: notifyIds.map((userId) => ({
            userId,
            tournamentId: application.tournamentId,
            teamApplicationId: application.id,
            message:
              userId === application.captainId
                ? `Оплата за заявку команды ${application.teamName} на турнир ${application.tournament.title} получена. Ожидайте модерацию.`
                : `Оплачена заявка команды ${application.teamName} на турнир ${application.tournament.title}. Откройте модерацию и примите/отклоните.`,
          })),
        });
      }
    }
  } else if (status === "AUTHORIZED") {
    await prisma.teamApplication.update({
      where: { id: application.id },
      data: {
        paymentProvider: PaymentProvider.TBANK,
        paymentId: paymentId || application.paymentId,
        paymentOrderId: orderId || application.paymentOrderId,
        paymentStatus: application.paymentStatus === PaymentStatus.PAID ? PaymentStatus.PAID : PaymentStatus.PENDING,
      },
    });
  }

  return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}

