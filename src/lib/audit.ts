import { prisma } from "@/lib/prisma";

export async function writeAuditLog(params: {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: unknown;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.metadata as object | undefined,
    },
  });
}
