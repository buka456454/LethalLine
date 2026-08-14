import { fail, ok } from "@/lib/api";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issuePhoneVerification, userMessageForIssueResult } from "@/lib/phoneVerification";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security/clientIp";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = rateLimit(`resend-phone-verify:${ip}`, 4, 60_000);
    if (!limit.allowed) return fail("Слишком много запросов", 429);

    const session = await readSession();
    if (!session) return fail("Unauthorized", 401);

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, phone: true, phoneVerifiedAt: true },
    });
    if (!user) return fail("User not found", 404);
    if (!user.phone) return fail("Сначала укажите номер телефона в настройках аккаунта", 400);
    if (user.phoneVerifiedAt) return fail("Телефон уже подтверждён", 400);

    const sent = await issuePhoneVerification(user.id, user.phone);

    return ok({
      sent: sent.smsSent,
      skipped: sent.smsSkipped,
      message: userMessageForIssueResult(sent),
    });
  } catch (err) {
    console.error("[resend-phone-verification]", err);
    return fail("Внутренняя ошибка сервера", 500);
  }
}
