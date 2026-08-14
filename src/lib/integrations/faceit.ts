import { IntegrationError, fetchJson } from "@/lib/integrations/http";

/**
 * FACEIT — второй, независимый от Valve источник для CS2.
 *
 * Ценен двумя вещами:
 *  1) OAuth2 доказывает владение аккаунтом FACEIT;
 *  2) в профиле FACEIT лежит привязанный SteamID (game_player_id), и если он
 *     совпадает с тем SteamID, который пользователь доказал через Steam OpenID,
 *     мы получаем перекрёстное подтверждение от двух разных платформ.
 *     Подделать такую пару значительно сложнее, чем одну ссылку или скриншот.
 */

const AUTH_BASE = "https://accounts.faceit.com";
const API_BASE = "https://open.faceit.com/data/v4";

export function isFaceitOauthConfigured() {
  return Boolean(process.env.FACEIT_CLIENT_ID?.trim() && process.env.FACEIT_CLIENT_SECRET?.trim());
}

export function isFaceitDataApiConfigured() {
  return Boolean(process.env.FACEIT_API_KEY?.trim());
}

export function buildFaceitAuthorizeUrl(params: { redirectUri: string; state: string }) {
  const clientId = process.env.FACEIT_CLIENT_ID?.trim();
  if (!clientId) throw new IntegrationError("faceit", "UNAUTHORIZED", "FACEIT_CLIENT_ID is not configured");
  const query = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: params.redirectUri,
    scope: "openid profile",
    state: params.state,
  });
  return `${AUTH_BASE}/accounts?${query.toString()}`;
}

type FaceitTokenResponse = { access_token?: string; token_type?: string; expires_in?: number };

export async function exchangeFaceitCode(params: { code: string; redirectUri: string }): Promise<string | null> {
  const clientId = process.env.FACEIT_CLIENT_ID?.trim();
  const clientSecret = process.env.FACEIT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new IntegrationError("faceit", "UNAUTHORIZED", "FACEIT OAuth credentials are not configured");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
  });

  const data = await fetchJson<FaceitTokenResponse>(`${AUTH_BASE}/oauth/token`, {
    provider: "faceit",
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    retries: 0,
  });

  return data?.access_token ?? null;
}

type FaceitUserInfo = { guid?: string; nickname?: string | null; picture?: string | null };

/** Кто именно только что залогинился через FACEIT. */
export async function getFaceitUserInfo(accessToken: string) {
  const data = await fetchJson<FaceitUserInfo>(`${AUTH_BASE}/userinfo`, {
    provider: "faceit",
    headers: { Authorization: `Bearer ${accessToken}` },
    retries: 0,
  });
  if (!data?.guid) return null;
  return { playerId: data.guid, nickname: data.nickname ?? null, avatarUrl: data.picture ?? null };
}

type FaceitPlayer = {
  player_id?: string;
  nickname?: string | null;
  avatar?: string | null;
  steam_id_64?: string | null;
  games?: Record<string, { skill_level?: number | null; faceit_elo?: number | null; game_player_id?: string | null }>;
};

export type FaceitSnapshot = {
  playerId: string;
  nickname: string | null;
  avatarUrl: string | null;
  /** SteamID64, привязанный к FACEIT-аккаунту. Основа кросс-проверки. */
  linkedSteamId64: string | null;
  skillLevel: number | null;
  elo: number | null;
};

function readPlayer(data: FaceitPlayer | null): FaceitSnapshot | null {
  if (!data?.player_id) return null;
  const cs2 = data.games?.cs2;
  return {
    playerId: data.player_id,
    nickname: data.nickname ?? null,
    avatarUrl: data.avatar ?? null,
    linkedSteamId64: cs2?.game_player_id ?? data.steam_id_64 ?? null,
    skillLevel: cs2?.skill_level ?? null,
    elo: cs2?.faceit_elo ?? null,
  };
}

function dataApiHeaders() {
  const key = process.env.FACEIT_API_KEY?.trim();
  if (!key) throw new IntegrationError("faceit", "UNAUTHORIZED", "FACEIT_API_KEY is not configured");
  return { Authorization: `Bearer ${key}` };
}

export async function getFaceitPlayerById(playerId: string): Promise<FaceitSnapshot | null> {
  const data = await fetchJson<FaceitPlayer>(`${API_BASE}/players/${encodeURIComponent(playerId)}`, {
    provider: "faceit",
    headers: dataApiHeaders(),
    cacheKey: `faceit:player:${playerId}`,
    cacheTtlMs: 10 * 60_000,
    notFoundAsNull: true,
  });
  return readPlayer(data);
}

/** Поиск профиля FACEIT по доказанному SteamID: работает и без OAuth. */
export async function getFaceitPlayerBySteamId(steamId64: string): Promise<FaceitSnapshot | null> {
  const url = `${API_BASE}/players?game=cs2&game_player_id=${encodeURIComponent(steamId64)}`;
  const data = await fetchJson<FaceitPlayer>(url, {
    provider: "faceit",
    headers: dataApiHeaders(),
    cacheKey: `faceit:steam:${steamId64}`,
    cacheTtlMs: 10 * 60_000,
    notFoundAsNull: true,
  });
  return readPlayer(data);
}
