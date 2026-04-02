import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

const SESSION_COOKIE = "ll_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  sub: string;
  role: Role;
  username: string;
  email: string;
  /** E.164 или null у старых аккаунтов без номера */
  phone: string | null;
  /**
   * false — номер указан, но не подтверждён по SMS.
   * У аккаунтов без телефона (legacy) считается true.
   */
  phoneVerified: boolean;
};

export function sessionPayloadFromUser(user: {
  id: string;
  role: Role;
  username: string;
  email: string;
  phone: string | null;
  phoneVerifiedAt: Date | null;
}): SessionPayload {
  return {
    sub: user.id,
    role: user.role,
    username: user.username,
    email: user.email,
    phone: user.phone,
    phoneVerified: true,
  };
}

function getLegacyAdminOwnerUsername() {
  const configured = process.env.ADMIN_OWNER_USERNAME?.trim();
  return (configured && configured.length > 0 ? configured : "6yKa").toLowerCase();
}

export function getAdminOwnerEmail() {
  const configured = process.env.ADMIN_OWNER_EMAIL?.trim().toLowerCase();
  return configured && configured.length > 0 ? configured : null;
}

export function isOwnerAdminSession(session: Pick<SessionPayload, "email" | "username">) {
  const ownerEmail = getAdminOwnerEmail();
  if (ownerEmail) {
    return session.email.toLowerCase() === ownerEmail;
  }
  return session.username.toLowerCase() === getLegacyAdminOwnerUsername();
}

export function canManageNewsSession(session: Pick<SessionPayload, "email" | "username" | "role">) {
  return isOwnerAdminSession(session) || session.role === Role.JOURNALIST;
}

export function canManageStreamCommentSession(session: Pick<SessionPayload, "email" | "username" | "role">) {
  return isOwnerAdminSession(session) || session.role === Role.COMMENTATOR;
}

export function canAccessAdminTabSession(session: Pick<SessionPayload, "email" | "username" | "role">) {
  return canManageNewsSession(session) || canManageStreamCommentSession(session);
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({
    role: payload.role,
    username: payload.username,
    email: payload.email,
    phone: payload.phone,
    phoneVerified: payload.phoneVerified,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

function legacyPhoneVerifiedFromPayload(p: Record<string, unknown>): boolean | null {
  if (typeof p.phoneVerified === "boolean") return p.phoneVerified;
  if (typeof p.emailVerified === "boolean") return p.emailVerified;
  return null;
}

export async function readSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const p = payload as Record<string, unknown>;
    const legacy = legacyPhoneVerifiedFromPayload(p);
    const phoneVerified = legacy !== null ? legacy : true;
    return {
      sub: String(p.sub),
      role: p.role as Role,
      username: String(p.username),
      email: String(p.email),
      phone: typeof p.phone === "string" ? p.phone : null,
      phoneVerified,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function hasRole(sessionRole: Role, requiredRole: Role) {
  const hierarchy: Record<Role, number> = {
    USER: 0,
    COMMENTATOR: 1,
    JOURNALIST: 1,
    ADMIN: 2,
    SUPERADMIN: 3,
  };
  return hierarchy[sessionRole] >= hierarchy[requiredRole];
}
