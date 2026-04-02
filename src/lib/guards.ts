import { Role } from "@prisma/client";
import {
  canAccessAdminTabSession,
  canManageNewsSession,
  canManageStreamCommentSession,
  hasRole,
  isOwnerAdminSession,
  readSession,
} from "@/lib/auth";

export async function requireAuth() {
  const session = await readSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireRole(required: Role) {
  const session = await requireAuth();
  if (!hasRole(session.role, required)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requireOwnerAdmin() {
  const session = await requireAuth();
  if (!isOwnerAdminSession(session)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requireAdminTabAccess() {
  const session = await requireAuth();
  if (!canAccessAdminTabSession(session)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requireNewsManager() {
  const session = await requireAuth();
  if (!canManageNewsSession(session)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requireStreamCommentManager() {
  const session = await requireAuth();
  if (!canManageStreamCommentSession(session)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
