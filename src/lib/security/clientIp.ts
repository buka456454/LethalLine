/**
 * IP клиента для rate-limit. Не доверяем слепо первому hop без прокси —
 * в проде за Cloudflare/nginx берите последний доверенный hop через TRUST_PROXY.
 */
export function getClientIp(request: Request): string {
  const trustProxy = process.env.TRUST_PROXY === "1" || process.env.NODE_ENV === "production";

  if (trustProxy) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first.slice(0, 64);
    }
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp.slice(0, 64);
    const cf = request.headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf.slice(0, 64);
  }

  return "local";
}
