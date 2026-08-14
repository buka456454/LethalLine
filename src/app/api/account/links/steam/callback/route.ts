import { NextResponse } from "next/server";
import { ExternalProvider } from "@prisma/client";
import { getAppBaseUrl } from "@/lib/appUrl";
import { IntegrationError } from "@/lib/integrations/http";
import { steamProfileUrl, verifySteamOpenIdResponse } from "@/lib/integrations/steamOpenId";
import { getSteamPlayerSummary, isSteamConfigured } from "@/lib/integrations/steamWeb";
import { linkExternalAccount } from "@/lib/verification/link";
import { syncAllGameProfiles } from "@/lib/verification/sync";
import { verifyLinkState } from "@/lib/verification/state";

export const dynamic = "force-dynamic";

function redirectWith(base: string, returnPath: string, params: Record<string, string>) {
  const url = new URL(`${base}${returnPath}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

/**
 * Возврат из Steam. Здесь мы никому не верим: подпись ответа проверяет сам
 * Steam, а привязку разрешает только подписанный нами state.
 */
export async function GET(request: Request) {
  const base = getAppBaseUrl(request);
  const url = new URL(request.url);

  const state = await verifyLinkState(url.searchParams.get("state"));
  if (!state || state.provider !== ExternalProvider.STEAM) {
    return redirectWith(base, "/account/questionnaire", { steamLink: "expired" });
  }

  const result = await verifySteamOpenIdResponse(
    url.searchParams,
    `${base}/api/account/links/steam/callback`,
  );

  if (!result.ok) {
    const reason = result.reason === "PROVIDER_ERROR" ? "unavailable" : "failed";
    return redirectWith(base, state.returnPath, { steamLink: reason });
  }

  let handle: string | null = null;
  let profileUrl: string | null = steamProfileUrl(result.steamId64);
  let avatarUrl: string | null = null;

  if (isSteamConfigured()) {
    try {
      const summary = await getSteamPlayerSummary(result.steamId64);
      handle = summary?.personaName ?? null;
      profileUrl = summary?.profileUrl ?? profileUrl;
      avatarUrl = summary?.avatarUrl ?? null;
    } catch (error) {
      // Профиль — украшение. Владение аккаунтом уже доказано подписью Steam.
      if (!(error instanceof IntegrationError)) throw error;
    }
  }

  const link = await linkExternalAccount({
    userId: state.userId,
    provider: ExternalProvider.STEAM,
    providerAccountId: result.steamId64,
    handle,
    profileUrl,
    avatarUrl,
    proofMethod: "OPENID",
  });

  if (!link.ok) {
    return redirectWith(base, state.returnPath, {
      steamLink: link.reason === "BLOCKED" ? "blocked" : "taken",
    });
  }

  // Сразу подтягиваем ранги: пользователь ожидает результат здесь и сейчас.
  try {
    await syncAllGameProfiles(state.userId);
  } catch (error) {
    if (!(error instanceof IntegrationError)) throw error;
  }

  return redirectWith(base, state.returnPath, { steamLink: "ok" });
}
