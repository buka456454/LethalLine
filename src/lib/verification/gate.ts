import { VerificationMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isVerificationCurrent, syncGameProfileVerification } from "@/lib/verification/sync";

/**
 * Ворота турниров с требованием подтверждённого ранга.
 *
 * Проверяем не только «когда-то одобрено», но и свежесть снимка: между
 * подтверждением и турниром игрок мог получить VAC или откатить ранг.
 * Поэтому протухший снимок обновляем прямо здесь, а не пускаем по старому.
 */

export type ExperienceGateResult = { allowed: true } | { allowed: false; message: string };

const GATE_FAILURE_MESSAGE =
  "Для этого турнира нужен подтверждённый ранг. Привяжите Steam в анкете и дождитесь проверки.";

export async function checkVerifiedExperienceGate(userId: string, gameId: string): Promise<ExperienceGateResult> {
  const profile = await prisma.userGameProfile.findUnique({
    where: { userId_gameId: { userId, gameId } },
    select: {
      experienceVerificationStatus: true,
      experienceVerificationNote: true,
      trustLevel: true,
      verificationMethod: true,
      verificationExpiresAt: true,
    },
  });

  if (!profile) return { allowed: false, message: GATE_FAILURE_MESSAGE };

  const isAutoVerified =
    profile.verificationMethod === VerificationMethod.API ||
    profile.verificationMethod === VerificationMethod.LINKED_ACCOUNT;
  const isStale = Boolean(profile.verificationExpiresAt && profile.verificationExpiresAt.getTime() < Date.now());

  if (isAutoVerified && isStale) {
    const outcome = await syncGameProfileVerification(userId, gameId);
    if (outcome.status === "UPDATED") {
      return outcome.decision.status === "APPROVED"
        ? { allowed: true }
        : { allowed: false, message: outcome.decision.note ?? GATE_FAILURE_MESSAGE };
    }
    // Обновиться не удалось — на старый снимок не опираемся.
    return { allowed: false, message: "Не удалось обновить проверку ранга. Попробуйте позже." };
  }

  if (!isVerificationCurrent(profile)) {
    return { allowed: false, message: profile.experienceVerificationNote ?? GATE_FAILURE_MESSAGE };
  }

  return { allowed: true };
}
