import { fail, ok } from "@/lib/api";
import { requireOwnerAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireOwnerAdmin();

    const [users, tournaments, registrations, matches] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, username: true, email: true, role: true, isBanned: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.tournament.findMany({
        include: { game: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.tournamentRegistration.findMany({
        include: { user: true, tournament: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.match.findMany({
        include: { tournament: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    return ok({ users, tournaments, registrations, matches });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to load admin overview", 500);
  }
}
