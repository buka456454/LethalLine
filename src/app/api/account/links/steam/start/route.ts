import { NextResponse } from "next/server";
import { ExternalProvider } from "@prisma/client";
import { fail } from "@/lib/api";
import { requireAuth } from "@/lib/guards";
import { getAppBaseUrl } from "@/lib/appUrl";
import { buildSteamLoginUrl } from "@/lib/integrations/steamOpenId";
import { sanitizeReturnPath, signLinkState } from "@/lib/verification/state";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Отправляет пользователя логиниться в Steam, чтобы доказать владение аккаунтом. */
export async function GET(request: Request) {
  try {
    const session = await requireAuth();

    const limit = rateLimit(`steam-link-start:${session.sub}`, 10, 60_000);
    if (!limit.allowed) return fail("Слишком много попыток. Попробуйте через минуту.", 429);

    const base = getAppBaseUrl(request);
    const requestUrl = new URL(request.url);
    const returnPath = sanitizeReturnPath(requestUrl.searchParams.get("returnPath"));

    const state = await signLinkState({
      userId: session.sub,
      provider: ExternalProvider.STEAM,
      returnPath,
    });

    // State едет внутри return_to: Steam подписывает return_to целиком,
    // поэтому подменить его в ответе не получится.
    const callback = new URL(`${base}/api/account/links/steam/callback`);
    callback.searchParams.set("state", state);

    return NextResponse.redirect(
      buildSteamLoginUrl({ returnTo: callback.toString(), realm: base }),
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Не удалось начать привязку Steam", 500);
  }
}
