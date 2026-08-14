import { IntegrationError, fetchJson } from "@/lib/integrations/http";

/**
 * Steam Web API: часы в игре, возраст аккаунта, видимость профиля и баны.
 * Ранги игр Valve тут не отдаёт — за ними идём в OpenDota и Leetify.
 */

export const STEAM_APP_IDS = {
  dota2: 570,
  cs2: 730,
} as const;

const BASE = "https://api.steampowered.com";

function requireKey() {
  const key = process.env.STEAM_WEB_API_KEY?.trim();
  if (!key) throw new IntegrationError("steam", "UNAUTHORIZED", "STEAM_WEB_API_KEY is not configured");
  return key;
}

export function isSteamConfigured() {
  return Boolean(process.env.STEAM_WEB_API_KEY?.trim());
}

type PlayerSummariesResponse = {
  response?: {
    players?: Array<{
      steamid: string;
      personaname?: string;
      profileurl?: string;
      avatarfull?: string;
      /** 3 — открытый профиль, всё остальное считаем закрытым. */
      communityvisibilitystate?: number;
      /** Unix seconds. Отдаётся только у открытых профилей. */
      timecreated?: number;
      /** Поле "Настоящее имя" — используем как место для одноразового кода. */
      realname?: string;
    }>;
  };
};

export type SteamPlayerSummary = {
  steamId64: string;
  personaName: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  createdAt: Date | null;
  realName: string | null;
};

export async function getSteamPlayerSummary(steamId64: string): Promise<SteamPlayerSummary | null> {
  const key = requireKey();
  const url = `${BASE}/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(key)}&steamids=${encodeURIComponent(steamId64)}`;
  const data = await fetchJson<PlayerSummariesResponse>(url, {
    provider: "steam",
    cacheKey: `steam:summary:${steamId64}`,
    cacheTtlMs: 60_000,
  });

  const player = data?.response?.players?.[0];
  if (!player) return null;

  return {
    steamId64: player.steamid,
    personaName: player.personaname ?? null,
    profileUrl: player.profileurl ?? null,
    avatarUrl: player.avatarfull ?? null,
    isPublic: player.communityvisibilitystate === 3,
    createdAt: player.timecreated ? new Date(player.timecreated * 1000) : null,
    realName: player.realname ?? null,
  };
}

type OwnedGamesResponse = {
  response?: {
    game_count?: number;
    games?: Array<{ appid: number; playtime_forever?: number }>;
  };
};

export type SteamPlaytime = {
  /** null означает «не смогли узнать»: закрытая статистика или игры нет в аккаунте. */
  hours: number | null;
  /** true, если Steam вообще отдал список игр (иначе детали профиля скрыты). */
  visible: boolean;
};

export async function getSteamPlaytimeHours(steamId64: string, appId: number): Promise<SteamPlaytime> {
  const key = requireKey();
  const url =
    `${BASE}/IPlayerService/GetOwnedGames/v0001/?key=${encodeURIComponent(key)}` +
    `&steamid=${encodeURIComponent(steamId64)}&include_played_free_games=1&appids_filter[0]=${appId}`;

  const data = await fetchJson<OwnedGamesResponse>(url, {
    provider: "steam",
    cacheKey: `steam:owned:${steamId64}:${appId}`,
    cacheTtlMs: 5 * 60_000,
  });

  const games = data?.response?.games;
  if (!Array.isArray(games)) {
    // Закрытые «Детали игр» — Steam молча отдаёт пустой объект.
    return { hours: null, visible: false };
  }

  const game = games.find((item) => item.appid === appId);
  if (!game) return { hours: 0, visible: true };
  return { hours: Math.floor((game.playtime_forever ?? 0) / 60), visible: true };
}

type PlayerBansResponse = {
  players?: Array<{
    SteamId: string;
    VACBanned?: boolean;
    NumberOfVACBans?: number;
    NumberOfGameBans?: number;
    DaysSinceLastBan?: number;
    CommunityBanned?: boolean;
    EconomyBan?: string;
  }>;
};

export type SteamBans = {
  vacBanned: boolean;
  vacBanCount: number;
  gameBanCount: number;
  daysSinceLastBan: number | null;
  communityBanned: boolean;
};

export async function getSteamBans(steamId64: string): Promise<SteamBans | null> {
  const key = requireKey();
  const url = `${BASE}/ISteamUser/GetPlayerBans/v1/?key=${encodeURIComponent(key)}&steamids=${encodeURIComponent(steamId64)}`;
  const data = await fetchJson<PlayerBansResponse>(url, {
    provider: "steam",
    cacheKey: `steam:bans:${steamId64}`,
    cacheTtlMs: 10 * 60_000,
  });

  const player = data?.players?.[0];
  if (!player) return null;

  return {
    vacBanned: Boolean(player.VACBanned),
    vacBanCount: player.NumberOfVACBans ?? 0,
    gameBanCount: player.NumberOfGameBans ?? 0,
    daysSinceLastBan: typeof player.DaysSinceLastBan === "number" ? player.DaysSinceLastBan : null,
    communityBanned: Boolean(player.CommunityBanned),
  };
}
