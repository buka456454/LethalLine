import { fail, ok } from "@/lib/api";
import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAuth();
    const notifications = await prisma.userTournamentNotification.findMany({
      where: { userId: session.sub },
      include: {
        tournament: { select: { id: true, title: true } },
        teamApplication: { select: { id: true, teamName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({ notifications });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Failed to load notifications", 500);
  }
}

export async function PATCH() {
  try {
    const session = await requireAuth();
    await prisma.userTournamentNotification.updateMany({
      where: { userId: session.sub, isRead: false },
      data: { isRead: true },
    });
    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Failed to update notifications", 500);
  }
}
