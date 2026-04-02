import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function sanitizeUsernameBase(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "")
    .slice(0, 20);
  return cleaned.length >= 3 ? cleaned : "player";
}

function usernameBaseFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return sanitizeUsernameBase(local);
}

async function allocateUniqueUsername(base: string): Promise<string> {
  const first = await prisma.user.findUnique({ where: { username: base }, select: { id: true } });
  if (!first) return base;

  for (let i = 1; i <= 200; i += 1) {
    const candidate = `${base}${i}`;
    const exists = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }

  const tail = randomBytes(3).toString("hex");
  return `${base}${tail}`.slice(0, 24);
}

export async function getOrCreateOAuthUserByEmail(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isBanned: true,
      phone: true,
      phoneVerifiedAt: true,
    },
  });
  if (existing) return existing;

  const base = usernameBaseFromEmail(email);
  const username = await allocateUniqueUsername(base);

  // OAuth-only account: store strong random hash so local password login isn't implicitly enabled.
  const passwordHash = await hashPassword(randomBytes(32).toString("hex"));

  return prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isBanned: true,
      phone: true,
      phoneVerifiedAt: true,
    },
  });
}
