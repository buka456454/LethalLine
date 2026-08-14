import { fail, ok } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security/clientIp";
import { z } from "zod";

const payloadSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  newPassword: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`reset-password:${ip}`, 4, 60_000);
  if (!limit.allowed) return fail("Too many requests", 429);

  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) return fail("Invalid reset payload", 422);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return fail("User not found", 404);

  const nextHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: nextHash },
  });

  return ok({ success: true });
}
