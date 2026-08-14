/** Базовые security headers для всех ответов. */
export function applySecurityHeaders(headers: Headers, opts?: { isProduction?: boolean }) {
  const isProduction = opts?.isProduction ?? process.env.NODE_ENV === "production";

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("X-DNS-Prefetch-Control", "off");

  // Умеренный CSP: Next.js/Framer нуждаются в inline; без 'unsafe-eval' в проде ломается меньше.
  const scriptSrc = isProduction
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "media-src 'self' https: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (isProduction) csp.push("upgrade-insecure-requests");
  headers.set("Content-Security-Policy", csp.join("; "));

  if (isProduction) {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}
