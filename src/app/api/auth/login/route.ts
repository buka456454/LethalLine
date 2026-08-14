import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";
import { sessionPayloadFromUser, setSessionCookie, signSession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security/clientIp";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`login:${ip}`, 8, 60_000);
  if (!limit.allowed) return fail("Too many requests", 429);

  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid login payload", 422);

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      passwordHash: true,
      isBanned: true,
      phone: true,
      phoneVerifiedAt: true,
    },
  });
  if (!user) return fail("Invalid credentials", 401);
  if (user.isBanned) return fail("Account is banned", 403);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return fail("Invalid credentials", 401);

  const token = await signSession(
    sessionPayloadFromUser({
      id: user.id,
      role: user.role,
      username: user.username,
      email: user.email,
      phone: user.phone,
      phoneVerifiedAt: user.phoneVerifiedAt,
    }),
  );
  await setSessionCookie(token);

  const notifications = await prisma.userTournamentNotification.findMany({
    where: { userId: user.id, isRead: false },
    include: {
      tournament: { select: { id: true, title: true } },
      teamApplication: { select: { id: true, teamName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const phoneVerified = user.phone == null || user.phoneVerifiedAt != null;

  return ok({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      phoneVerified,
    },
    notifications,
  });
}
