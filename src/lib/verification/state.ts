import { SignJWT, jwtVerify } from "jose";
import { ExternalProvider } from "@prisma/client";

/**
 * Подписанный state для привязки внешних аккаунтов.
 *
 * Без него сторонний сайт мог бы подсунуть залогиненному пользователю
 * callback-ссылку и привязать к его аккаунту чужой Steam. State жёстко
 * связывает начало и конец флоу с конкретным пользователем.
 */

const STATE_TTL_SECONDS = 10 * 60;

export type LinkState = {
  userId: string;
  provider: ExternalProvider;
  /** Куда вернуть пользователя после привязки. Только относительный путь. */
  returnPath: string;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function signLinkState(state: LinkState) {
  return new SignJWT({
    provider: state.provider,
    returnPath: state.returnPath,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(state.userId)
    .setAudience("account-link")
    .setIssuedAt()
    .setExpirationTime(`${STATE_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyLinkState(token: string | null | undefined): Promise<LinkState | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: "account-link" });
    const provider = payload.provider;
    const returnPath = payload.returnPath;
    if (typeof payload.sub !== "string") return null;
    if (provider !== "STEAM" && provider !== "FACEIT" && provider !== "RIOT") return null;
    return {
      userId: payload.sub,
      provider,
      returnPath: sanitizeReturnPath(typeof returnPath === "string" ? returnPath : null),
    };
  } catch {
    return null;
  }
}

/** Только внутренние пути: иначе callback превращается в open redirect. */
export function sanitizeReturnPath(path: string | null | undefined): string {
  const fallback = "/account/questionnaire";
  if (!path) return fallback;
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//")) return fallback;
  return path;
}
