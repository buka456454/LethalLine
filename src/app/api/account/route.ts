import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { hashPassword, readSession, sessionPayloadFromUser, setSessionCookie, signSession, verifyPassword } from "@/lib/auth";
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
      phone: true,
      phoneVerifiedAt: true,
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

  const emailOrUsernameClause = [
    { email: incoming.email },
    { username: incoming.username },
  ] as const;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [...emailOrUsernameClause],
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

  const phoneValue = incoming.phone;
  const normalizedCurrent = currentUser.phone ?? null;
  let phoneChanged = false;
  let nextPhone: string | null = null;

  if (phoneValue === null) {
    if (normalizedCurrent !== null) {
      phoneChanged = true;
      nextPhone = null;
    }
  } else if (phoneValue !== normalizedCurrent) {
    const phoneTaken = await prisma.user.findFirst({
      where: { phone: phoneValue, NOT: { id: session.sub } },
      select: { id: true },
    });
    if (phoneTaken) return fail("Этот номер уже привязан к другому аккаунту", 409);
    phoneChanged = true;
    nextPhone = phoneValue;
  }

  const patchData: Prisma.UserUpdateInput = {
    email: incoming.email,
    username: incoming.username,
    displayName: incoming.displayName || null,
    avatarUrl: incoming.avatarUrl || null,
    bio: incoming.bio || null,
    ...(passwordHash ? { passwordHash } : {}),
    ...(phoneChanged
      ? {
          phone: nextPhone,
          phoneVerificationCodeHash: null,
          phoneVerificationExpires: null,
        }
      : {}),
  };

  const updatedUser = await prisma.user.update({
    where: { id: session.sub },
    data: patchData,
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      role: true,
      phone: true,
      phoneVerifiedAt: true,
    },
  });

  const fresh = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      role: true,
      phone: true,
      phoneVerifiedAt: true,
    },
  });

  if (!fresh) return fail("User not found", 404);

  const token = await signSession(sessionPayloadFromUser(fresh));
  await setSessionCookie(token);

  return ok({
    user: fresh,
  });
}
