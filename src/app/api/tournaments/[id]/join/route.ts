import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";
import { requireAuth } from "@/lib/guards";
import { RegistrationStatus, TournamentStatus } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";
import { checkVerifiedExperienceGate } from "@/lib/verification/gate";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const limit = rateLimit(`tournament-join:${session.sub}`, 20, 10 * 60_000);
    if (!limit.allowed) return fail("Слишком много попыток. Попробуйте позже.", 429);
    const { id } = await context.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        registrations: true,
      },
    });

    if (!tournament) return fail("Tournament not found", 404);
    const now = new Date();
    const isCompleted = tournament.status === TournamentStatus.COMPLETED;
    const isFinishedByTime = Boolean(tournament.endsAt && tournament.endsAt <= now);
    if (isCompleted || isFinishedByTime) {
      return fail("Tournament is completed", 400);
    }
    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      return fail("Registration is closed", 400);
    }

    if (tournament.requiresVerifiedExperience) {
      const gate = await checkVerifiedExperienceGate(session.sub, tournament.gameId);
      if (!gate.allowed) return fail(gate.message, 403);
    }

    if (tournament.registrations.length >= tournament.maxParticipants) {
      return fail("Tournament is full", 400);
    }

    const registration = await prisma.tournamentRegistration.upsert({
      where: {
        userId_tournamentId: { userId: session.sub, tournamentId: id },
      },
      create: {
        userId: session.sub,
        tournamentId: id,
        status: RegistrationStatus.PENDING,
      },
      update: {
        status: RegistrationStatus.PENDING,
      },
    });

    return ok({ registration }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    return fail("Failed to join tournament", 500);
  }
}
