import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";
import { setSessionCookie, signSession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limit = rateLimit(`login:${ip}`, 8, 60_000);
  if (!limit.allowed) return fail("Too many requests", 429);

  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid login payload", 422);

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return fail("Invalid credentials", 401);
  if (user.isBanned) return fail("Account is banned", 403);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return fail("Invalid credentials", 401);

  const token = await signSession({
    sub: user.id,
    role: user.role,
    username: user.username,
    email: user.email,
  });
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

  return ok({
    user: { id: user.id, email: user.email, username: user.username, role: user.role },
    notifications,
  });
}
