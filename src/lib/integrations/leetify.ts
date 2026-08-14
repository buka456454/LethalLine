import { fetchJson } from "@/lib/integrations/http";

/**
 * Leetify — источник ранга CS2. Valve не отдаёт Premier CS Rating через Web API,
 * а Leetify собирает его из матчей и отдаёт по Steam64 ID.
 *
 * Ключевое для нас: запрос идёт по SteamID64, полученному из Steam OpenID,
 * то есть подставить чужой рейтинг пользователь не может.
 *
 * Guidelines Leetify просят не хранить их данные долго, поэтому мы держим
 * только нормализованный ранг и дату снимка, а сам ответ не сохраняем.
 */

const BASE = "https://api-public.cs-prod.leetify.com";

function authHeaders(): Record<string, string> {
  const key = process.env.LEETIFY_API_KEY?.trim();
  // Без ключа API тоже работает, но с более жёсткими лимитами.
  return key ? { Authorization: `Bearer ${key}` } : {};
}

export function isLeetifyConfigured() {
  return Boolean(process.env.LEETIFY_API_KEY?.trim());
}

type LeetifyProfileResponse = {
  id?: string;
  steam64_id?: string;
  name?: string | null;
  privacy_mode?: string | null;
  winrate?: number | null;
  total_matches?: number | null;
  first_match_date?: string | null;
  bans?: Array<{ platform?: string | null; platform_nickname?: string | null; banned_since?: string | null }> | null;
  ranks?: {
    leetify?: number | null;
    premier?: number | null;
    faceit?: number | null;
    faceit_elo?: number | null;
    wingman?: number | null;
    renown?: number | null;
  } | null;
};

export type LeetifyBan = { platform: string; nickname: string | null; bannedSince: Date | null };

export type LeetifySnapshot = {
  steamId64: string;
  name: string | null;
  isPublic: boolean;
  /** Premier CS Rating, например 19309. */
  premierRating: number | null;
  faceitLevel: number | null;
  faceitElo: number | null;
  totalMatches: number | null;
  firstMatchAt: Date | null;
  bans: LeetifyBan[];
};

export async function getLeetifySnapshot(steamId64: string): Promise<LeetifySnapshot | null> {
  const url = `${BASE}/v3/profile?steam64_id=${encodeURIComponent(steamId64)}`;
  const data = await fetchJson<LeetifyProfileResponse>(url, {
    provider: "leetify",
    headers: authHeaders(),
    cacheKey: `leetify:profile:${steamId64}`,
    cacheTtlMs: 10 * 60_000,
    notFoundAsNull: true,
  });
  if (!data) return null;

  const bans: LeetifyBan[] = (data.bans ?? []).flatMap((ban) => {
    if (!ban?.platform) return [];
    return [
      {
        platform: ban.platform,
        nickname: ban.platform_nickname ?? null,
        bannedSince: ban.banned_since ? new Date(ban.banned_since) : null,
      },
    ];
  });

  return {
    steamId64: data.steam64_id ?? steamId64,
    name: data.name ?? null,
    isPublic: (data.privacy_mode ?? "").toLowerCase() === "public",
    premierRating: data.ranks?.premier ?? null,
    faceitLevel: data.ranks?.faceit ?? null,
    faceitElo: data.ranks?.faceit_elo ?? null,
    totalMatches: typeof data.total_matches === "number" ? data.total_matches : null,
    firstMatchAt: data.first_match_date ? new Date(data.first_match_date) : null,
    bans,
  };
}
