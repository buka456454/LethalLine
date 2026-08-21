import { RegistrationStatus } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { ModerationError, moderateRegistration } from "@/lib/admin/moderateRegistration";
import { requireOwnerAdmin } from "@/lib/guards";
import { z } from "zod";

const payloadSchema = z.object({
  status: z.enum([RegistrationStatus.APPROVED, RegistrationStatus.REJECTED]),
});

export async function PATCH(request: Request, context: { params: Promise<{ registrationId: string }> }) {
  try {
    const session = await requireOwnerAdmin();
    const { registrationId } = await context.params;
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid payload", 422);

    const registration = await moderateRegistration({
      registrationId,
      status: parsed.data.status,
      actorId: session.sub,
      source: "admin_api",
    });

    return ok({ registration });
  } catch (error) {
    if (error instanceof ModerationError) return fail(error.message, error.status);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to update registration", 500);
  }
}
