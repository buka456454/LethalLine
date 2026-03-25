import { fail, ok } from "@/lib/api";
import { requireOwnerAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireOwnerAdmin();

    const logs = await prisma.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return ok({ logs });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to load audit logs", 500);
  }
}
