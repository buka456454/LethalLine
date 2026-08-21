import { writeAuditLog } from "@/lib/audit";
import { ModerationError } from "@/lib/admin/moderateRegistration";
import { prisma } from "@/lib/prisma";

export async function moderateExperience(params: {
  profileId: string;
  status: "APPROVED" | "REJECTED";
  note?: string | null;
  actorId: string;
  source?: string;
}) {
  const existing = await prisma.userGameProfile.findUnique({
    where: { id: params.profileId },
    select: {
      id: true,
      userId: true,
      gameId: true,
      experienceVerificationStatus: true,
    },
  });
  if (!existing) throw new ModerationError("Experience verification request not found", 404);
  if (existing.experienceVerificationStatus === "NOT_SUBMITTED") {
    throw new ModerationError("Proof is not submitted yet", 400);
  }

  const profile = await prisma.userGameProfile.update({
    where: { id: params.profileId },
    data: {
      experienceVerificationStatus: params.status,
      experienceVerificationReviewedAt: new Date(),
      experienceVerificationNote: params.status === "REJECTED" ? params.note ?? null : null,
    },
    include: {
      user: { select: { id: true, username: true } },
      game: { select: { id: true, name: true } },
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    action: "USER_GAME_EXPERIENCE_VERIFICATION_UPDATED",
    entity: "UserGameProfile",
    entityId: profile.id,
    metadata: {
      status: params.status,
      note: params.note ?? null,
      userId: profile.user.id,
      gameId: profile.game.id,
      source: params.source ?? "admin_api",
    },
  });

  return profile;
}
