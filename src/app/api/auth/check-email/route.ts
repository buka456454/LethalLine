import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";
import { z } from "zod";

const querySchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ email: searchParams.get("email") ?? "" });

  if (!parsed.success) {
    return fail("Invalid email", 422);
  }

  const { email } = parsed.data;
  const exists = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return ok({
    email,
    available: !exists,
  });
}
