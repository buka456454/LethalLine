import { fail, ok } from "@/lib/api";
import { requireAuth } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAuth();
    const [memberApplications, captainApplications] = await Promise.all([
      prisma.teamApplication.findMany({
        where: {
          members: {
            some: {
              linkedUserId: session.sub,
            },
          },
        },
        include: {
          tournament: { select: { id: true, title: true, startsAt: true, status: true } },
          captain: { select: { username: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.teamApplication.findMany({
        where: { captainId: session.sub },
        include: {
          tournament: { select: { id: true, title: true, startsAt: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return ok({ memberApplications, captainApplications });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Failed to load account applications", 500);
  }
}
