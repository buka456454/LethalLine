import { timingSafeEqual } from "node:crypto";
import { fail, ok } from "@/lib/api";
import { resyncStaleProfiles } from "@/lib/verification/sync";

export const dynamic = "force-dynamic";

/** Сколько профилей обновляем за один запуск, чтобы не упереться в лимиты API. */
const BATCH_SIZE = 50;

function isAuthorized(request: Request) {
  const expected = process.env.VERIFICATION_CRON_SECRET?.trim();
  if (!expected) return false;

  const provided = request.headers.get("x-cron-secret")?.trim() ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Ранг меняется, а VAC может прийти через месяц после привязки.
 * Этот роут обновляет протухшие снимки: вызывать по расписанию.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) return fail("Forbidden", 403);

  try {
    const result = await resyncStaleProfiles(BATCH_SIZE);
    return ok(result);
  } catch {
    return fail("Не удалось обновить проверки", 500);
  }
}
