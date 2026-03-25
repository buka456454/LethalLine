import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";
import { hashPassword, setSessionCookie, signSession } from "@/lib/auth";
import { registerSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limit = rateLimit(`register:${ip}`, 6, 60_000);
  if (!limit.allowed) return fail("Too many requests", 429);

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid register payload", 422);

  const { email, username, password } = parsed.data;
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existing) return fail("User already exists", 409);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash: await hashPassword(password),
    },
  });

  const token = await signSession({
    sub: user.id,
    role: user.role,
    username: user.username,
    email: user.email,
  });
  await setSessionCookie(token);

  return ok({
    user: { id: user.id, email: user.email, username: user.username, role: user.role },
  });
}
