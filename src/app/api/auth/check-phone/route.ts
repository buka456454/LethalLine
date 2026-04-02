import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";
import { normalizeRuPhoneE164 } from "@/lib/phone";
import { z } from "zod";

const querySchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((v) => normalizeRuPhoneE164(v))
    .pipe(z.string().regex(/^\+7\d{10}$/, "Неверный номер")),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ phone: searchParams.get("phone") ?? "" });

  if (!parsed.success) {
    return fail("Invalid phone", 422);
  }

  const { phone } = parsed.data;
  const exists = await prisma.user.findUnique({
    where: { phone },
    select: { id: true },
  });

  return ok({
    phone,
    available: !exists,
  });
}
