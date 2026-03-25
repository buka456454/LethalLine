import { Role } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireOwnerAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const payloadSchema = z.object({
  role: z.enum([Role.USER, Role.ADMIN, Role.SUPERADMIN]).optional(),
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
