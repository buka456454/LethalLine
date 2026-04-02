import { fail, ok } from "@/lib/api";
import { readSession, sessionPayloadFromUser, setSessionCookie, signSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { completePhoneVerification } from "@/lib/phoneVerification";
import { rateLimit } from "@/lib/rate-limit";
import { verifyPhoneCodeSchema } from "@/lib/schemas";
import { hashVerificationToken } from "@/lib/verification";

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return fail("Unauthorized", 401);

  const limit = rateLimit(`verify-phone-code:${session.sub}`, 20, 600_000);
  if (!limit.allowed) return fail("Слишком много попыток. Подождите несколько минут.", 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON", 400);
  }

  const parsed = verifyPhoneCodeSchema.safeParse(body);
  if (!parsed.success) return fail("Нужен код из 6 цифр", 422);

  const codeHash = hashVerificationToken(parsed.data.code);
  const user = await prisma.user.findFirst({
    where: {
      id: session.sub,
      phoneVerificationCodeHash: codeHash,
      phoneVerificationExpires: { gt: new Date() },
    },
    select: {
      id: true,
      role: true,
      username: true,
      email: true,
      phone: true,
      phoneVerifiedAt: true,
    },
  });

  if (!user) {
    return fail("Неверный или просроченный код", 400);
  }

  await completePhoneVerification(user.id);

  const refreshed = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, username: true, email: true, phone: true, phoneVerifiedAt: true },
  });

  if (refreshed) {
    const jwt = await signSession(sessionPayloadFromUser(refreshed));
    await setSessionCookie(jwt);
  }

  return ok({ message: "Телефон подтверждён" });
}
