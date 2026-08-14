import { fetchJson } from "@/lib/integrations/http";
import { formatDotaRankTier } from "@/lib/verification/rankLabels";

/**
 * OpenDota — источник ранга Dota 2. Valve не отдаёт медаль через Web API,
 * а OpenDota индексирует её у игроков, разрешивших публичные матчи.
 *
 * Работает по account_id (SteamID32), который мы получаем из доказанного
 * через Steam OpenID SteamID64. Подставить чужой ранг нельзя: account_id
 * не выбирается пользователем.
 */

const BASE = "https://api.opendota.com/api";

function withKey(path: string) {
  const key = process.env.OPENDOTA_API_KEY?.trim();
  const separator = path.includes("?") ? "&" : "?";
  return key ? `${BASE}${path}${separator}api_key=${encodeURIComponent(key)}` : `${BASE}${path}`;
}

type OpenDotaPlayer = {
  profile?: {
    account_id?: number;
    personaname?: string | null;
    avatarfull?: string | null;
    profileurl?: string | null;
  } | null;
  rank_tier?: number | null;
  leaderboard_rank?: number | null;
  mmr_estimate?: { estimate?: number | null } | null;
};

type OpenDotaWinLoss = { win?: number; lose?: number };

export type OpenDotaSnapshot = {
  accountId: number;
  personaName: string | null;
  rankTier: number | null;
  rankLabel: string | null;
  leaderboardRank: number | null;
  mmrEstimate: number | null;
  rankedMatches: number | null;
};

export async function getOpenDotaSnapshot(accountId: number): Promise<OpenDotaSnapshot | null> {
  const player = await fetchJson<OpenDotaPlayer>(withKey(`/players/${accountId}`), {
    provider: "opendota",
    cacheKey: `opendota:player:${accountId}`,
    cacheTtlMs: 10 * 60_000,
    notFoundAsNull: true,
  });
  if (!player) return null;

  // /wl отдельным запросом: он показывает, есть ли у аккаунта вообще публичная история.
  let rankedMatches: number | null = null;
  try {
    const wl = await fetchJson<OpenDotaWinLoss>(withKey(`/players/${accountId}/wl?significant=1`), {
      provider: "opendota",
      cacheKey: `opendota:wl:${accountId}`,
      cacheTtlMs: 10 * 60_000,
      notFoundAsNull: true,
    });
    if (wl) rankedMatches = (wl.win ?? 0) + (wl.lose ?? 0);
  } catch {
    // Матчи — вспомогательный сигнал, без них проверка ранга всё равно возможна.
    rankedMatches = null;
  }

  const rankTier = typeof player.rank_tier === "number" ? player.rank_tier : null;

  return {
    accountId,
    personaName: player.profile?.personaname ?? null,
    rankTier,
    rankLabel: formatDotaRankTier(rankTier),
    leaderboardRank: player.leaderboard_rank ?? null,
    mmrEstimate: player.mmr_estimate?.estimate ?? null,
    rankedMatches,
  };
}
