import { ExternalProvider } from "@prisma/client";
import { IntegrationError } from "@/lib/integrations/http";
import { getFaceitPlayerBySteamId, isFaceitDataApiConfigured } from "@/lib/integrations/faceit";
import { getLeetifySnapshot } from "@/lib/integrations/leetify";
import { getOpenDotaSnapshot } from "@/lib/integrations/openDota";
import { steamId64ToAccountId, steamProfileUrl } from "@/lib/integrations/steamOpenId";
import { STEAM_APP_IDS, getSteamBans, getSteamPlaytimeHours, getSteamPlayerSummary } from "@/lib/integrations/steamWeb";
import { VERIFICATION_FLAGS, type VerificationFlag } from "@/lib/verification/flags";
import { formatFaceitLevel, formatPremierRating } from "@/lib/verification/rankLabels";

/**
 * Сбор доказательств по конкретной игре.
 *
 * Все запросы идут по идентификатору, который пользователь не выбирает:
 * SteamID64 приходит из подписанного ответа Steam OpenID. Поэтому подставить
 * чужой ранг здесь невозможно — можно только привязать свой аккаунт.
 */

/** Аккаунт моложе этого срока подозрителен для высоких рангов. */
const NEW_ACCOUNT_DAYS = 60;

/** Ниже этого числа часов высокий ранг выглядит как смурф. */
const SMURF_HOURS_THRESHOLD = 300;

/** Dota: «Власть I» и выше. Шкала — см. dotaRankTierToScore. */
const DOTA_HIGH_RANK_SCORE = 61;

/** CS2: Premier с этого рейтинга считаем высоким. */
const CS2_HIGH_PREMIER = 18_000;

export type GameEvidence = {
  /** Умеем ли мы проверять эту дисциплину автоматически. */
  supported: boolean;
  /** Какая привязка нужна для проверки. */
  requiredProvider: ExternalProvider | null;
  /** Откуда фактически взяты данные. */
  sourceProvider: ExternalProvider | null;
  rankLabel: string | null;
  rankNumeric: number | null;
  hoursPlayed: number | null;
  accountCreatedAt: Date | null;
  handle: string | null;
  profileUrl: string | null;
  flags: VerificationFlag[];
  /** Провайдер был недоступен: это не вина игрока, решение принимать нельзя. */
  providerUnavailable: boolean;
};

const UNSUPPORTED: GameEvidence = {
  supported: false,
  requiredProvider: null,
  sourceProvider: null,
  rankLabel: null,
  rankNumeric: null,
  hoursPlayed: null,
  accountCreatedAt: null,
  handle: null,
  profileUrl: null,
  flags: [],
  providerUnavailable: false,
};

/** Какие дисциплины проверяются автоматически и что для этого нужно привязать. */
export function getGameVerificationSupport(gameSlug: string): {
  supported: boolean;
  requiredProvider: ExternalProvider | null;
} {
  if (gameSlug === "dota-2" || gameSlug === "cs2") {
    return { supported: true, requiredProvider: ExternalProvider.STEAM };
  }
  // Valorant: автоматическая проверка возможна только через Riot Sign-On,
  // а он выдаётся вместе с production-ключом Riot. До этого — код в скриншоте.
  return { supported: false, requiredProvider: null };
}

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

function addBanFlags(
  flags: VerificationFlag[],
  bans: { vacBanned: boolean; vacBanCount: number; gameBanCount: number } | null,
) {
  if (!bans) return;
  if (bans.vacBanned || bans.vacBanCount > 0) flags.push(VERIFICATION_FLAGS.VAC_BAN);
  if (bans.gameBanCount > 0) flags.push(VERIFICATION_FLAGS.GAME_BAN);
}

async function collectDota(steamId64: string): Promise<GameEvidence> {
  const flags: VerificationFlag[] = [];
  const accountId = steamId64ToAccountId(steamId64);

  const [summary, playtime, bans, dota] = await Promise.all([
    getSteamPlayerSummary(steamId64),
    getSteamPlaytimeHours(steamId64, STEAM_APP_IDS.dota2),
    getSteamBans(steamId64),
    accountId ? getOpenDotaSnapshot(accountId) : Promise.resolve(null),
  ]);

  if (summary && !summary.isPublic) flags.push(VERIFICATION_FLAGS.PRIVATE_PROFILE);
  else if (!playtime.visible) flags.push(VERIFICATION_FLAGS.PRIVATE_PROFILE);

  addBanFlags(flags, bans);

  const rankLabel = dota?.rankLabel ?? null;
  if (!rankLabel) flags.push(VERIFICATION_FLAGS.NO_RANKED_DATA);

  const createdAt = summary?.createdAt ?? null;
  if (createdAt && daysBetween(createdAt, new Date()) < NEW_ACCOUNT_DAYS) {
    flags.push(VERIFICATION_FLAGS.NEW_ACCOUNT);
  }

  const rankScore = dota?.rankTier ? Math.floor(dota.rankTier / 10) * 10 + (dota.rankTier % 10) : null;
  if (
    rankScore !== null &&
    rankScore >= DOTA_HIGH_RANK_SCORE &&
    playtime.hours !== null &&
    playtime.hours < SMURF_HOURS_THRESHOLD
  ) {
    flags.push(VERIFICATION_FLAGS.LOW_HOURS_HIGH_RANK);
  }

  return {
    supported: true,
    requiredProvider: ExternalProvider.STEAM,
    sourceProvider: ExternalProvider.STEAM,
    rankLabel,
    rankNumeric: dota?.mmrEstimate ?? null,
    hoursPlayed: playtime.hours,
    accountCreatedAt: createdAt,
    handle: summary?.personaName ?? dota?.personaName ?? null,
    profileUrl: summary?.profileUrl ?? steamProfileUrl(steamId64),
    flags,
    providerUnavailable: false,
  };
}

async function collectCs2(steamId64: string): Promise<GameEvidence> {
  const flags: VerificationFlag[] = [];

  const [summary, playtime, bans, leetify] = await Promise.all([
    getSteamPlayerSummary(steamId64),
    getSteamPlaytimeHours(steamId64, STEAM_APP_IDS.cs2),
    getSteamBans(steamId64),
    getLeetifySnapshot(steamId64).catch((error: unknown) => {
      // Leetify — сторонний сервис. Его недоступность не должна ломать проверку,
      // но и одобрять без данных о ранге мы не будем.
      if (error instanceof IntegrationError) return null;
      throw error;
    }),
  ]);

  if (summary && !summary.isPublic) flags.push(VERIFICATION_FLAGS.PRIVATE_PROFILE);
  else if (!playtime.visible) flags.push(VERIFICATION_FLAGS.PRIVATE_PROFILE);

  addBanFlags(flags, bans);

  if (leetify?.bans.some((ban) => ban.platform.toLowerCase() === "faceit")) {
    flags.push(VERIFICATION_FLAGS.FACEIT_BAN);
  }

  let faceitLevel = leetify?.faceitLevel ?? null;
  let faceitElo = leetify?.faceitElo ?? null;

  // FACEIT по доказанному SteamID — независимое подтверждение уровня.
  if (isFaceitDataApiConfigured() && faceitLevel === null) {
    try {
      const faceit = await getFaceitPlayerBySteamId(steamId64);
      if (faceit) {
        faceitLevel = faceit.skillLevel;
        faceitElo = faceit.elo;
      }
    } catch (error) {
      if (!(error instanceof IntegrationError)) throw error;
    }
  }

  const premierLabel = formatPremierRating(leetify?.premierRating ?? null);
  const rankLabel = premierLabel ?? formatFaceitLevel(faceitLevel);
  if (!rankLabel) flags.push(VERIFICATION_FLAGS.NO_RANKED_DATA);

  const createdAt = summary?.createdAt ?? null;
  if (createdAt && daysBetween(createdAt, new Date()) < NEW_ACCOUNT_DAYS) {
    flags.push(VERIFICATION_FLAGS.NEW_ACCOUNT);
  }

  const premier = leetify?.premierRating ?? null;
  if (premier !== null && premier >= CS2_HIGH_PREMIER && playtime.hours !== null && playtime.hours < SMURF_HOURS_THRESHOLD) {
    flags.push(VERIFICATION_FLAGS.LOW_HOURS_HIGH_RANK);
  }

  return {
    supported: true,
    requiredProvider: ExternalProvider.STEAM,
    sourceProvider: ExternalProvider.STEAM,
    rankLabel,
    rankNumeric: premier ?? faceitElo ?? null,
    hoursPlayed: playtime.hours,
    accountCreatedAt: createdAt,
    handle: summary?.personaName ?? leetify?.name ?? null,
    profileUrl: summary?.profileUrl ?? steamProfileUrl(steamId64),
    flags,
    providerUnavailable: leetify === null && !isFaceitDataApiConfigured(),
  };
}

/**
 * Собирает данные по игре для уже доказанного Steam-аккаунта.
 * Бросает IntegrationError только если недоступен сам Steam: без него
 * нельзя ни часы посчитать, ни баны проверить.
 */
export async function collectGameEvidence(gameSlug: string, steamId64: string | null): Promise<GameEvidence> {
  const support = getGameVerificationSupport(gameSlug);
  if (!support.supported) return UNSUPPORTED;
  if (!steamId64) {
    return { ...UNSUPPORTED, supported: true, requiredProvider: support.requiredProvider };
  }

  if (gameSlug === "dota-2") return collectDota(steamId64);
  if (gameSlug === "cs2") return collectCs2(steamId64);
  return UNSUPPORTED;
}
