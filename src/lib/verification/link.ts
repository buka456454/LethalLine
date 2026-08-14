import { ExternalProvider, VerificationMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { TRUST_LEVEL } from "@/lib/verification/trust";

/**
 * Привязка внешних игровых аккаунтов.
 *
 * Главная защита от «взял чужой аккаунт» живёт здесь: один и тот же
 * внешний аккаунт не может быть привязан к двум пользователям сайта,
 * а заблокированные аккаунты не привязываются вообще.
 */

export type LinkFailure =
  | { ok: false; reason: "BLOCKED"; message: string }
  | { ok: false; reason: "TAKEN"; message: string };

export type LinkResult = { ok: true; changed: boolean } | LinkFailure;

export async function linkExternalAccount(params: {
  userId: string;
  provider: ExternalProvider;
  providerAccountId: string;
  handle?: string | null;
  profileUrl?: string | null;
  avatarUrl?: string | null;
  /** OPENID | OAUTH | PROFILE_CODE — чем именно доказано владение. */
  proofMethod: string;
}): Promise<LinkResult> {
  const { userId, provider, providerAccountId } = params;

  const blocked = await prisma.blockedExternalAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
  });
  if (blocked) {
    return {
      ok: false,
      reason: "BLOCKED",
      message: "Этот игровой аккаунт заблокирован администрацией и не может быть привязан.",
    };
  }

  const existing = await prisma.externalAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    select: { id: true, userId: true },
  });

  if (existing && existing.userId !== userId) {
    return {
      ok: false,
      reason: "TAKEN",
      message:
        "Этот игровой аккаунт уже привязан к другому профилю на сайте. Если это ваш аккаунт, напишите в поддержку.",
    };
  }

  const data = {
    handle: params.handle ?? null,
    profileUrl: params.profileUrl ?? null,
    avatarUrl: params.avatarUrl ?? null,
    proofMethod: params.proofMethod,
    lastCheckedAt: new Date(),
  };

  // Пользователь мог ранее привязать другой аккаунт того же провайдера:
  // @@unique([userId, provider]) заставляет заменить его, а не плодить копии.
  await prisma.externalAccount.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, providerAccountId, ...data },
    update: { providerAccountId, ...data },
  });

  await writeAuditLog({
    actorId: userId,
    action: "EXTERNAL_ACCOUNT_LINKED",
    entity: "ExternalAccount",
    entityId: providerAccountId,
    metadata: { provider, proofMethod: params.proofMethod, handle: params.handle ?? null },
  });

  return { ok: true, changed: !existing };
}

export async function getLinkedAccount(userId: string, provider: ExternalProvider) {
  return prisma.externalAccount.findUnique({ where: { userId_provider: { userId, provider } } });
}

export async function getLinkedSteamId(userId: string): Promise<string | null> {
  const account = await getLinkedAccount(userId, ExternalProvider.STEAM);
  return account?.providerAccountId ?? null;
}

/**
 * Отвязка. Все подтверждения, полученные через этот провайдер, теряют силу:
 * иначе можно было бы привязать чужой аккаунт, получить галочку и отвязаться.
 */
export async function unlinkExternalAccount(userId: string, provider: ExternalProvider) {
  const account = await getLinkedAccount(userId, provider);
  if (!account) return { removed: false, downgraded: 0 };

  const { count } = await prisma.userGameProfile.updateMany({
    where: {
      userId,
      verificationSource: provider,
      verificationMethod: { in: [VerificationMethod.API, VerificationMethod.LINKED_ACCOUNT] },
    },
    data: {
      experienceVerificationStatus: "NOT_SUBMITTED",
      experienceVerificationNote: null,
      experienceVerificationReviewedAt: null,
      verificationMethod: VerificationMethod.NONE,
      trustLevel: TRUST_LEVEL.NONE,
      verificationSource: null,
      verifiedRankLabel: null,
      verifiedRankNumeric: null,
      verifiedHoursPlayed: null,
      verificationFlags: [],
      verificationSyncedAt: null,
      verificationExpiresAt: null,
    },
  });

  await prisma.externalAccount.delete({ where: { id: account.id } });

  await writeAuditLog({
    actorId: userId,
    action: "EXTERNAL_ACCOUNT_UNLINKED",
    entity: "ExternalAccount",
    entityId: account.providerAccountId,
    metadata: { provider, downgradedProfiles: count },
  });

  return { removed: true, downgraded: count };
}
