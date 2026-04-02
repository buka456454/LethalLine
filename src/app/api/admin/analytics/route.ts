import { TournamentStatus } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { requireOwnerAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireOwnerAdmin();

    const [usersTotal, usersBanned, activeTournaments, registrationsTotal, approvedRegistrations, matchesLive] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isBanned: true } }),
        prisma.tournament.count({
          where: {
            status: {
              in: [TournamentStatus.REGISTRATION_OPEN, TournamentStatus.IN_PROGRESS, TournamentStatus.RESULTS_COUNTING],
            },
          },
        }),
        prisma.tournamentRegistration.count(),
        prisma.tournamentRegistration.count({ where: { status: "APPROVED" } }),
        prisma.match.count({ where: { status: "LIVE" } }),
      ]);

    const conversionRate = registrationsTotal === 0 ? 0 : Math.round((approvedRegistrations / registrationsTotal) * 100);
    return ok({
      metrics: {
        usersTotal,
        usersBanned,
        activeTournaments,
        registrationsTotal,
        approvedRegistrations,
        conversionRate,
        matchesLive,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to load analytics", 500);
  }
}
