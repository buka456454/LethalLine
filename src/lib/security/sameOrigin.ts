/**
 * CSRF defense-in-depth для cookie-сессии (SameSite=Lax уже помогает).
 * Разрешаем только запросы с Origin/Referer нашего хоста или APP_URL.
 */

function parseOrigin(value: string | null): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function allowedHosts(request: Request): Set<string> {
  const hosts = new Set<string>();
  const host = request.headers.get("host")?.toLowerCase();
  if (host) hosts.add(host.split(":")[0]!);

  for (const raw of [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    const u = parseOrigin(raw?.trim() ?? null);
    if (u) hosts.add(u.hostname.toLowerCase());
  }

  // Локальная разработка
  hosts.add("localhost");
  hosts.add("127.0.0.1");

  return hosts;
}

function originHostMatches(candidate: URL, allowed: Set<string>): boolean {
  return allowed.has(candidate.hostname.toLowerCase());
}

/**
 * true — запрос выглядит как same-origin (или без Origin/Referer у безопасных клиентов).
 * Для мутаций из браузера Origin почти всегда есть.
 */
export function isSameOriginRequest(request: Request): boolean {
  const allowed = allowedHosts(request);
  const origin = parseOrigin(request.headers.get("origin"));
  if (origin) return originHostMatches(origin, allowed);

  const referer = parseOrigin(request.headers.get("referer"));
  if (referer) return originHostMatches(referer, allowed);

  // Нет Origin/Referer: не браузерный form/fetch (curl, cron, webhook).
  // Решение о пропуске — у вызывающего (allowlist в middleware).
  return false;
}

export function sameOriginFailureMessage() {
  return "Forbidden origin";
}
