import { IntegrationError, fetchText } from "@/lib/integrations/http";

/**
 * Steam OpenID 2.0 — единственный способ доказать, что человек действительно
 * владеет Steam-аккаунтом. Ссылку на чужой профиль подставить легко, а вот
 * пройти логин в Steam за другого человека — нет.
 *
 * Ответ Steam подписан, и проверку подписи делает сам Steam на нашем серверном
 * запросе check_authentication. Клиенту в этом флоу мы не доверяем ни в чём.
 */

const OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const OPENID_NS = "http://specs.openid.net/auth/2.0";
const IDENTIFIER_SELECT = "http://specs.openid.net/auth/2.0/identifier_select";

const CLAIMED_ID_PATTERN = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

export function buildSteamLoginUrl(params: { returnTo: string; realm: string }) {
  const query = new URLSearchParams({
    "openid.ns": OPENID_NS,
    "openid.mode": "checkid_setup",
    "openid.return_to": params.returnTo,
    "openid.realm": params.realm,
    "openid.identity": IDENTIFIER_SELECT,
    "openid.claimed_id": IDENTIFIER_SELECT,
  });
  return `${OPENID_ENDPOINT}?${query.toString()}`;
}

export type SteamOpenIdResult =
  | { ok: true; steamId64: string }
  | { ok: false; reason: "BAD_MODE" | "BAD_CLAIMED_ID" | "BAD_RETURN_TO" | "SIGNATURE_REJECTED" | "PROVIDER_ERROR" };

/**
 * Проверяет ответ Steam. `expectedReturnToPrefix` защищает от переиспользования
 * ответа, выписанного для другого сайта или другого нашего роута.
 */
export async function verifySteamOpenIdResponse(
  searchParams: URLSearchParams,
  expectedReturnToPrefix: string,
): Promise<SteamOpenIdResult> {
  if (searchParams.get("openid.mode") !== "id_res") {
    return { ok: false, reason: "BAD_MODE" };
  }

  const returnTo = searchParams.get("openid.return_to") ?? "";
  if (!returnTo.startsWith(expectedReturnToPrefix)) {
    return { ok: false, reason: "BAD_RETURN_TO" };
  }

  const claimedId = searchParams.get("openid.claimed_id") ?? "";
  const match = CLAIMED_ID_PATTERN.exec(claimedId);
  if (!match) {
    return { ok: false, reason: "BAD_CLAIMED_ID" };
  }
  const steamId64 = match[1];

  // Пересылаем Steam ровно те же параметры, подменив только mode.
  // Любая правка подписанных полей приведёт к is_valid:false.
  const body = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (!key.startsWith("openid.")) continue;
    body.set(key, value);
  }
  body.set("openid.mode", "check_authentication");

  let raw: string;
  try {
    raw = await fetchText(OPENID_ENDPOINT, {
      provider: "steam-openid",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      timeoutMs: 10_000,
    });
  } catch (error) {
    if (error instanceof IntegrationError) return { ok: false, reason: "PROVIDER_ERROR" };
    throw error;
  }

  const isValid = raw
    .split("\n")
    .map((line) => line.trim())
    .includes("is_valid:true");

  if (!isValid) return { ok: false, reason: "SIGNATURE_REJECTED" };
  return { ok: true, steamId64 };
}

const STEAM_ID64_BASE = 76561197960265728n;

/** SteamID64 -> account_id (он же SteamID32), в этом виде его ждёт OpenDota. */
export function steamId64ToAccountId(steamId64: string): number | null {
  try {
    const value = BigInt(steamId64) - STEAM_ID64_BASE;
    if (value <= 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(value);
  } catch {
    return null;
  }
}

export function steamProfileUrl(steamId64: string) {
  return `https://steamcommunity.com/profiles/${steamId64}`;
}
