import { Prisma, Role } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { getAdminOwnerEmail } from "@/lib/auth";
import { requireOwnerAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const payloadSchema = z.object({
  role: z.enum([Role.USER, Role.ADMIN, Role.SUPERADMIN, Role.JOURNALIST, Role.COMMENTATOR]).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().max(200).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const session = await requireOwnerAdmin();
    const { userId } = await context.params;
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Invalid payload", 422);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        role: parsed.data.role,
        isBanned: parsed.data.isBanned,
        banReason: parsed.data.banReason,
      },
    });

    await writeAuditLog({
      actorId: session.sub,
      action: "USER_UPDATED",
      entity: "User",
      entityId: user.id,
      metadata: parsed.data,
    });

    return ok({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isBanned: user.isBanned,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to update user", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const session = await requireOwnerAdmin();
    const { userId } = await context.params;

    if (userId === session.sub) return fail("Нельзя удалить собственный аккаунт", 403);

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isBanned: true,
      },
    });
    if (!target) return fail("Пользователь не найден", 404);

    const ownerEmail = getAdminOwnerEmail();
    if (ownerEmail && target.email.toLowerCase() === ownerEmail) {
      return fail("Нельзя удалить owner-аккаунт", 403);
    }

    await prisma.user.delete({ where: { id: userId } });

    await writeAuditLog({
      actorId: session.sub,
      action: "USER_DELETED",
      entity: "User",
      entityId: target.id,
      metadata: {
        username: target.username,
        email: target.email,
        role: target.role,
        isBanned: target.isBanned,
      },
    });

    return ok({ deletedUserId: target.id });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return fail("Пользователь не найден", 404);
    }
    return fail("Failed to delete user", 500);
  }
}
