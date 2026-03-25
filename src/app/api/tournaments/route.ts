import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";
import { requireOwnerAdmin } from "@/lib/guards";
import { createTournamentSchema } from "@/lib/schemas";
import { TournamentStatus } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { generateDoubleEliminationMatches, generateSingleEliminationMatches } from "@/lib/bracket";

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    include: {
      game: true,
      registrations: true,
    },
    orderBy: { startsAt: "asc" },
  });
  return ok({ tournaments });
}

export async function POST(request: Request) {
  try {
    const session = await requireOwnerAdmin();
    const body = await request.json();
    const parsed = createTournamentSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid tournament payload", 422);

    const tournament = await prisma.tournament.create({
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description,
        format: parsed.data.format,
        maxParticipants: parsed.data.maxParticipants,
        gameId: parsed.data.gameId,
        rules: parsed.data.rules,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        status: parsed.data.status ?? TournamentStatus.REGISTRATION_OPEN,
        isPublished: parsed.data.isPublished ?? true,
      },
    });

    const seedMatches =
      parsed.data.format === "DOUBLE_ELIMINATION"
        ? generateDoubleEliminationMatches(parsed.data.maxParticipants)
        : parsed.data.format === "SINGLE_ELIMINATION"
          ? generateSingleEliminationMatches(parsed.data.maxParticipants)
          : [];

    if (seedMatches.length > 0) {
      await prisma.match.createMany({
        data: seedMatches.map((match) => ({
          tournamentId: tournament.id,
          round: match.round,
          orderInRound: match.orderInRound,
          bracketSegment: match.bracketSegment,
        })),
      });
    }

    await writeAuditLog({
      actorId: session.sub,
      action: "TOURNAMENT_CREATED",
      entity: "Tournament",
      entityId: tournament.id,
      metadata: parsed.data,
    });

    return ok({ tournament }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail("Failed to create tournament", 500);
  }
}
