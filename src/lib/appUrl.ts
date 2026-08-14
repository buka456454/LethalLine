/**
 * Базовый адрес приложения. Нужен там, где мы отдаём внешнему сервису
 * ссылку возврата (OpenID / OAuth) и не можем позволить себе ошибиться в домене.
 */
export function getRequestOrigin(request: Request): string | null {
  const host = request.headers.get("host");
  if (!host) return null;
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function getAppBaseUrl(request: Request): string {
  const configured = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  const base = configured || getRequestOrigin(request);
  if (!base) throw new Error("Cannot resolve app base URL: set APP_URL");
  return base.replace(/\/$/, "");
}
