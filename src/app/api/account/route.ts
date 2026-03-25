import { fail, ok } from "@/lib/api";
import { hashPassword, readSession, setSessionCookie, signSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountUpdateSchema } from "@/lib/schemas";

export async function GET() {
  const session = await readSession();
  if (!session) return fail("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) return fail("User not found", 404);
  return ok({ user });
}

export async function PATCH(request: Request) {
  const session = await readSession();
  if (!session) return fail("Unauthorized", 401);

  const body = await request.json();
  const parsed = accountUpdateSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid profile payload", 422);

  const incoming = parsed.data;
  const currentUser = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!currentUser) return fail("User not found", 404);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: incoming.email }, { username: incoming.username }],
      NOT: { id: session.sub },
    },
    select: { id: true },
  });

  if (existing) return fail("Email or username already in use", 409);

  let passwordHash: string | undefined;
  if (incoming.newPassword) {
    const validCurrent = await verifyPassword(incoming.currentPassword ?? "", currentUser.passwordHash);
    if (!validCurrent) return fail("Current password is incorrect", 400);
    passwordHash = await hashPassword(incoming.newPassword);
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.sub },
    data: {
      email: incoming.email,
      username: incoming.username,
      displayName: incoming.displayName || null,
      avatarUrl: incoming.avatarUrl || null,
      bio: incoming.bio || null,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      role: true,
    },
  });

  const token = await signSession({
    sub: updatedUser.id,
    role: updatedUser.role,
    username: updatedUser.username,
    email: updatedUser.email,
  });
  await setSessionCookie(token);

  return ok({ user: updatedUser });
}
