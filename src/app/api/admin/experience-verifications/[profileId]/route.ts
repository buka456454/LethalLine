import { fail, ok } from "@/lib/api";
import { ModerationError } from "@/lib/admin/moderateRegistration";
import { moderateExperience } from "@/lib/admin/moderateExperience";
import { requireOwnerAdmin } from "@/lib/guards";
import { adminExperienceVerificationPatchSchema } from "@/lib/schemas";

export async function PATCH(request: Request, context: { params: Promise<{ profileId: string }> }) {
  try {
    const session = await requireOwnerAdmin();
    const { profileId } = await context.params;
    const parsed = adminExperienceVerificationPatchSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid payload", 422);

    const profile = await moderateExperience({
      profileId,
      status: parsed.data.status,
      note: parsed.data.note ?? null,
      actorId: session.sub,
      source: "admin_api",
    });

    return ok({ profile });
  } catch (error) {
    if (error instanceof ModerationError) return fail(error.message, error.status);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to update experience verification", 500);
  }
}
