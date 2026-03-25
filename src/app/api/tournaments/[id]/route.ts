import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      game: true,
      registrations: { include: { user: true } },
      matches: { orderBy: [{ round: "asc" }, { orderInRound: "asc" }] },
    },
  });

  if (!tournament) return fail("Tournament not found", 404);
  return ok({ tournament });
}
