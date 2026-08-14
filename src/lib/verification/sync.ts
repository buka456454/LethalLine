import { ExperienceVerificationStatus, ExternalProvider, VerificationMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { IntegrationError } from "@/lib/integrations/http";
import { isNotPlayed } from "@/lib/gameQuestionnaireConfig";
import { VERIFICATION_FLAGS, type VerificationFlag } from "@/lib/verification/flags";
import { getLinkedSteamId } from "@/lib/verification/link";
import { decideFromEvidence, detectRankMismatch, type VerificationDecision } from "@/lib/verification/policy";
import { collectGameEvidence, getGameVerificationSupport } from "@/lib/verification/providers";
import { dotaMedalLabels, premierBucketLabels } from "@/lib/verification/rankLabels";
import { TRUST_LEVEL } from "@/lib/verification/trust";

/**
 * Единственное место, где обновляется автопроверка игрового профиля.
 *
 * Всё, что может изменить статус подтверждения — привязка аккаунта, кнопка
 * «Проверить снова», подача заявки на турнир, ночной перезапуск — проходит
 * через syncGameProfileVerification, поэтому правила и провенанс всегда одни.
 */

/** Разрыв в ступенях ранга, который ещё считаем добросовестной ошибкой. */
const RANK_TOLERANCE: Record<string, { labels: string[]; tolerance: number }> = {
  // 5 ступеней = одна медаль целиком: «Легенда I» против «Легенды V» — не обман.
  "dota-2": { labels: dotaMedalLabels(), tolerance: 5 },
  // Premier: расхождение больше одного цветового диапазона уже показательно.
  cs2: { labels: premierBucketLabels(), tolerance: 1 },
};

export type SyncOutcome =
  | { status: "SKIPPED"; reason: "GAME_NOT_SUPPORTED" | "NOT_PLAYED" | "NO_LINKED_ACCOUNT" }
  | { status: "FAILED"; reason: string }
  | { status: "UPDATED"; decision: VerificationDecision; verifiedRankLabel: string | null };

type ProfileRow = {
  id: string;
  userId: string;
  gameId: string;
  rankLabel: string | null;
  verificationMethod: VerificationMethod;
  game: { slug: string };
};

async function applyDecision(profile: ProfileRow, decision: VerificationDecision, evidence: {
  rankLabel: string | null;
  rankNumeric: number | null;
  hoursPlayed: number | null;
  sourceProvider: ExternalProvider | null;
}) {
  const now = new Date();

  await prisma.userGameProfile.update({
    where: { id: profile.id },
    data: {
      experienceVerificationStatus: decision.status,
      experienceVerificationNote: decision.note,
      experienceVerificationReviewedAt: now,
      verificationMethod: decision.method,
      trustLevel: decision.trustLevel,
      verificationSource: evidence.sourceProvider,
      verifiedRankLabel: evidence.rankLabel,
      verifiedRankNumeric: evidence.rankNumeric,
      verifiedHoursPlayed: evidence.hoursPlayed,
      verificationFlags: decision.flags,
      verificationSyncedAt: now,
      verificationExpiresAt: decision.expiresAt,
    },
  });

  await writeAuditLog({
    actorId: profile.userId,
    action: "EXPERIENCE_AUTO_VERIFIED",
    entity: "UserGameProfile",
    entityId: profile.id,
    metadata: {
      game: profile.game.slug,
      status: decision.status,
      method: decision.method,
      flags: decision.flags,
      verifiedRankLabel: evidence.rankLabel,
      selfReportedRankLabel: profile.rankLabel,
    },
  });
}

async function syncProfile(profile: ProfileRow, steamId64: string | null): Promise<SyncOutcome> {
  const support = getGameVerificationSupport(profile.game.slug);
  if (!support.supported) return { status: "SKIPPED", reason: "GAME_NOT_SUPPORTED" };
  if (isNotPlayed(profile.rankLabel)) return { status: "SKIPPED", reason: "NOT_PLAYED" };
  if (!steamId64) return { status: "SKIPPED", reason: "NO_LINKED_ACCOUNT" };

  let evidence;
  try {
    evidence = await collectGameEvidence(profile.game.slug, steamId64);
  } catch (error) {
    if (error instanceof IntegrationError) return { status: "FAILED", reason: error.kind };
    throw error;
  }

  // Аккаунт мог быть заблокирован после привязки.
  const blocked = evidence.sourceProvider
    ? await prisma.blockedExternalAccount.findUnique({
        where: { provider_providerAccountId: { provider: evidence.sourceProvider, providerAccountId: steamId64 } },
      })
    : null;

  const flags: VerificationFlag[] = [...evidence.flags];
  if (blocked) flags.push(VERIFICATION_FLAGS.REUSED_ACCOUNT);

  const comparison = RANK_TOLERANCE[profile.game.slug];
  if (
    comparison &&
    detectRankMismatch({
      orderedLabels: comparison.labels,
      selfReported: profile.rankLabel,
      verified: evidence.rankLabel,
      tolerance: comparison.tolerance,
    })
  ) {
    flags.push(VERIFICATION_FLAGS.RANK_MISMATCH);
  }

  const decision = decideFromEvidence({ ...evidence, flags });
  await applyDecision(profile, decision, evidence);

  return { status: "UPDATED", decision, verifiedRankLabel: evidence.rankLabel };
}

const PROFILE_SELECT = {
  id: true,
  userId: true,
  gameId: true,
  rankLabel: true,
  verificationMethod: true,
  game: { select: { slug: true } },
} as const;

/** Пересинхронизировать одну дисциплину пользователя. */
export async function syncGameProfileVerification(userId: string, gameId: string): Promise<SyncOutcome> {
  const profile = await prisma.userGameProfile.findUnique({
    where: { userId_gameId: { userId, gameId } },
    select: PROFILE_SELECT,
  });
  if (!profile) return { status: "SKIPPED", reason: "NOT_PLAYED" };

  const steamId64 = await getLinkedSteamId(userId);
  return syncProfile(profile, steamId64);
}

/** Пересинхронизировать все автопроверяемые дисциплины пользователя. */
export async function syncAllGameProfiles(userId: string) {
  const profiles = await prisma.userGameProfile.findMany({
    where: { userId },
    select: PROFILE_SELECT,
  });
  const steamId64 = await getLinkedSteamId(userId);

  const results: Array<{ gameSlug: string; outcome: SyncOutcome }> = [];
  for (const profile of profiles) {
    results.push({ gameSlug: profile.game.slug, outcome: await syncProfile(profile, steamId64) });
  }
  return results;
}

/**
 * Снимки протухают: ранг падает, аккаунт получает VAC. Обновляем пачками,
 * чтобы cron не держал соединение слишком долго.
 */
export async function resyncStaleProfiles(limit = 50) {
  const now = new Date();
  const stale = await prisma.userGameProfile.findMany({
    where: {
      verificationExpiresAt: { not: null, lte: now },
      verificationMethod: { in: [VerificationMethod.API, VerificationMethod.LINKED_ACCOUNT] },
    },
    orderBy: { verificationExpiresAt: "asc" },
    take: limit,
    select: PROFILE_SELECT,
  });

  let updated = 0;
  let failed = 0;
  const steamIdCache = new Map<string, string | null>();

  for (const profile of stale) {
    let steamId64 = steamIdCache.get(profile.userId);
    if (steamId64 === undefined) {
      steamId64 = await getLinkedSteamId(profile.userId);
      steamIdCache.set(profile.userId, steamId64);
    }
    const outcome = await syncProfile(profile, steamId64);
    if (outcome.status === "UPDATED") updated += 1;
    else if (outcome.status === "FAILED") failed += 1;
  }

  return { examined: stale.length, updated, failed };
}

/**
 * Подтверждение действительно сейчас? Используется воротами турниров:
 * протухший снимок не пускает, даже если статус когда-то был APPROVED.
 */
export function isVerificationCurrent(profile: {
  experienceVerificationStatus: ExperienceVerificationStatus;
  trustLevel: number;
  verificationExpiresAt: Date | null;
}) {
  if (profile.experienceVerificationStatus !== ExperienceVerificationStatus.APPROVED) return false;
  if (profile.trustLevel < TRUST_LEVEL.SCREENSHOT) return false;
  if (profile.verificationExpiresAt && profile.verificationExpiresAt.getTime() < Date.now()) return false;
  return true;
}
