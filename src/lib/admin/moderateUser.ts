import { Role } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { getAdminOwnerEmail } from "@/lib/auth";
import { ModerationError } from "@/lib/admin/moderateRegistration";
import { prisma } from "@/lib/prisma";

export async function moderateUser(params: {
  userId: string;
  role?: Role;
  isBanned?: boolean;
  banReason?: string | null;
  actorId: string;
  source?: string;
}) {
  const target = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, email: true, username: true, role: true },
  });
  if (!target) throw new ModerationError("User not found", 404);

  const ownerEmail = getAdminOwnerEmail();
  if (ownerEmail && target.email.toLowerCase() === ownerEmail) {
    if (params.role && params.role !== target.role) {
      throw new ModerationError("Cannot change owner role", 403);
    }
    if (params.isBanned === true) {
      throw new ModerationError("Cannot ban owner account", 403);
    }
  }

  if (params.role === Role.SUPERADMIN) {
    throw new ModerationError("SUPERADMIN role cannot be assigned via this action", 403);
  }

  const user = await prisma.user.update({
    where: { id: params.userId },
    data: {
      ...(params.role !== undefined ? { role: params.role } : {}),
      ...(params.isBanned !== undefined ? { isBanned: params.isBanned } : {}),
      ...(params.banReason !== undefined ? { banReason: params.banReason } : {}),
    },
  });

  await writeAuditLog({
    actorId: params.actorId,
    action: "USER_UPDATED",
    entity: "User",
    entityId: user.id,
    metadata: {
      role: params.role,
      isBanned: params.isBanned,
      banReason: params.banReason,
      source: params.source ?? "admin_api",
    },
  });

  return user;
}

/** Resolve site owner user id for audit logs from Telegram actions. */
export async function resolveOwnerActorId(): Promise<string> {
  const ownerEmail = getAdminOwnerEmail();
  if (ownerEmail) {
    const byEmail = await prisma.user.findFirst({
      where: { email: { equals: ownerEmail, mode: "insensitive" } },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  const byUsername = await prisma.user.findFirst({
    where: { username: { equals: "6yKa", mode: "insensitive" } },
    select: { id: true },
  });
  if (byUsername) return byUsername.id;

  throw new ModerationError("Owner account not found for audit", 500);
}
