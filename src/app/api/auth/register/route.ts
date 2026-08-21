import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";
import { hashPassword, sessionPayloadFromUser, setSessionCookie, signSession } from "@/lib/auth";
import { registerSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security/clientIp";
import { adminApplicationsUrl, escapeHtml } from "@/lib/telegram/format";
import { notifyAdmin } from "@/lib/telegram/notify";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`register:${ip}`, 6, 60_000);
  if (!limit.allowed) return fail("Too many requests", 429);

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid register payload", 422);

  const { email, username, password, phone } = parsed.data;
  const normalizedPhone = typeof phone === "string" ? phone.trim() || null : null;
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }, ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])],
    },
    select: { email: true, username: true, phone: true },
  });

  if (existing) {
    if (existing.email === email) return fail("Этот email уже занят", 409);
    if (existing.username === username) return fail("Этот ник уже занят", 409);
    if (normalizedPhone && existing.phone === normalizedPhone) return fail("Этот номер уже зарегистрирован", 409);
    return fail("User already exists", 409);
  }

  const user = await prisma.user.create({
    data: {
      email,
      username,
      phone: normalizedPhone,
      passwordHash: await hashPassword(password),
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      phone: true,
      phoneVerifiedAt: true,
    },
  });

  void notifyAdmin(
    [
      `<b>Новый пользователь</b>`,
      `@${escapeHtml(user.username)}`,
      `email: ${escapeHtml(user.email)}`,
      `<a href="${adminApplicationsUrl()}">Админка</a>`,
    ].join("\n"),
  );

  const token = await signSession(sessionPayloadFromUser(user));
  await setSessionCookie(token);

  return ok({
    user: { id: user.id, email: user.email, username: user.username, role: user.role },
  });
}
