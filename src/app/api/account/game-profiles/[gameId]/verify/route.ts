import { ExternalProvider } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { describeFlag, flagHint } from "@/lib/verification/flags";
import { getLinkedAccount } from "@/lib/verification/link";
import { getGameVerificationSupport } from "@/lib/verification/providers";
import { syncGameProfileVerification } from "@/lib/verification/sync";

export const dynamic = "force-dynamic";

/** Кнопка «Проверить снова»: внешние API дёргать без ограничений нельзя. */
const MAX_ATTEMPTS_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60_000;

export async function POST(request: Request, context: { params: Promise<{ gameId: string }> }) {
  try {
    const session = await requireAuth();
    const { gameId } = await context.params;

    const limit = rateLimit(`experience-verify:${session.sub}`, MAX_ATTEMPTS_PER_WINDOW, WINDOW_MS);
    if (!limit.allowed) {
      return fail("Проверку можно запускать не чаще пяти раз в десять минут.", 429);
    }

    const game = await prisma.game.findUnique({ where: { id: gameId }, select: { slug: true } });
    if (!game) return fail("Дисциплина не найдена", 404);

    const support = getGameVerificationSupport(game.slug);
    if (!support.supported) {
      return fail("Для этой дисциплины автоматическая проверка пока недоступна.", 400);
    }

    if (support.requiredProvider === ExternalProvider.STEAM) {
      const linked = await getLinkedAccount(session.sub, ExternalProvider.STEAM);
      if (!linked) return fail("Сначала привяжите аккаунт Steam.", 409);
    }

    const outcome = await syncGameProfileVerification(session.sub, gameId);

    if (outcome.status === "SKIPPED") {
      const message =
        outcome.reason === "NO_LINKED_ACCOUNT"
          ? "Сначала привяжите аккаунт Steam."
          : outcome.reason === "NOT_PLAYED"
            ? "Заполните анкету по этой дисциплине."
            : "Автоматическая проверка для этой дисциплины недоступна.";
      return fail(message, 409);
    }

    if (outcome.status === "FAILED") {
      return fail("Сервис статистики недоступен. Попробуйте позже.", 503);
    }

    return ok({
      status: outcome.decision.status,
      method: outcome.decision.method,
      trustLevel: outcome.decision.trustLevel,
      verifiedRankLabel: outcome.verifiedRankLabel,
      note: outcome.decision.note,
      flags: outcome.decision.flags.map((flag) => ({
        code: flag,
        text: describeFlag(flag),
        hint: flagHint(flag),
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Не удалось выполнить проверку", 500);
  }
}
