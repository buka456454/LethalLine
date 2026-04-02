import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { adminExperienceVerificationPatchSchema } from "@/lib/schemas";

export async function PATCH(request: Request, context: { params: Promise<{ profileId: string }> }) {
  try {
    const session = await requireOwnerAdmin();
    const { profileId } = await context.params;
    const parsed = adminExperienceVerificationPatchSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid payload", 422);

    const existing = await prisma.userGameProfile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        userId: true,
        gameId: true,
        experienceVerificationStatus: true,
      },
    });
    if (!existing) return fail("Experience verification request not found", 404);
    if (existing.experienceVerificationStatus === "NOT_SUBMITTED") {
      return fail("Proof is not submitted yet", 400);
    }

    const profile = await prisma.userGameProfile.update({
      where: { id: profileId },
      data: {
        experienceVerificationStatus: parsed.data.status,
        experienceVerificationReviewedAt: new Date(),
        experienceVerificationNote: parsed.data.status === "REJECTED" ? parsed.data.note ?? null : null,
      },
      include: {
        user: { select: { id: true, username: true } },
        game: { select: { id: true, name: true } },
      },
    });

    await writeAuditLog({
      actorId: session.sub,
      action: "USER_GAME_EXPERIENCE_VERIFICATION_UPDATED",
      entity: "UserGameProfile",
      entityId: profile.id,
      metadata: {
        status: parsed.data.status,
        note: parsed.data.note ?? null,
        userId: profile.user.id,
        gameId: profile.game.id,
      },
    });

    return ok({ profile });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to update experience verification", 500);
  }
}
