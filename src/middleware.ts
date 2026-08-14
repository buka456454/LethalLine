import { NextResponse, type NextRequest } from "next/server";
import { getClientIp } from "@/lib/security/clientIp";
import { applySecurityHeaders } from "@/lib/security/headers";
import { isSameOriginRequest } from "@/lib/security/sameOrigin";
import { rateLimit } from "@/lib/rate-limit";

/** Внешние POST без браузерного Origin — не режем по CSRF. */
const ORIGIN_EXEMPT_PREFIXES = [
  "/api/payments/tbank/webhook",
  "/api/cron/",
];

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Типичный сканер / path traversal — сразу 404. */
const BLOCKED_PATH =
  /(?:^|\/)(?:\.env(?:\..*)?|\.git(?:\/|$)|wp-admin|wp-login|phpmyadmin|xmlrpc\.php|\.htaccess|server-status|actuator)(?:\/|$)/i;

function withSecurityHeaders(response: NextResponse) {
  applySecurityHeaders(response.headers);
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BLOCKED_PATH.test(pathname)) {
    return withSecurityHeaders(new NextResponse("Not Found", { status: 404 }));
  }

  if (MUTATING.has(request.method) && pathname.startsWith("/api/")) {
    const exempt = ORIGIN_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
    if (!exempt && !isSameOriginRequest(request)) {
      // Разрешаем отсутствие Origin только в development (curl/Postman).
      const hasOriginHint =
        Boolean(request.headers.get("origin")) || Boolean(request.headers.get("referer"));
      if (process.env.NODE_ENV === "production" || hasOriginHint) {
        return withSecurityHeaders(
          NextResponse.json({ ok: false, error: "Forbidden origin" }, { status: 403 }),
        );
      }
    }

    const ip = getClientIp(request);
    const global = rateLimit(`mw:api:${ip}`, 180, 60_000);
    if (!global.allowed) {
      return withSecurityHeaders(
        NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 }),
      );
    }

    // Жёстче на auth-эндпоинтах (дополнительно к лимитам в роутах).
    if (pathname.startsWith("/api/auth/")) {
      const authLimit = rateLimit(`mw:auth:${ip}`, 40, 60_000);
      if (!authLimit.allowed) {
        return withSecurityHeaders(
          NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 }),
        );
      }
    }
  }

  const response = NextResponse.next();
  return withSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Все пути кроме статики Next и типичных ассетов.
     * /uploads отдаём через route handler — headers нужны и там.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
