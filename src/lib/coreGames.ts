import { CORE_GAMES } from "@/lib/gameAssets";
import { prisma } from "@/lib/prisma";

/** Idempotent: ensures Valorant, Dota 2, CS2 exist. Merges legacy `counter-strike-2` into `cs2`. */
export async function ensureCoreGames() {
  for (const g of CORE_GAMES) {
    await prisma.game.upsert({
      where: { slug: g.slug },
      update: { name: g.name, description: g.description },
      create: {
        name: g.name,
        slug: g.slug,
        description: g.description,
      },
    });
  }

  const cs2 = await prisma.game.findUnique({ where: { slug: "cs2" } });
  const legacy = await prisma.game.findUnique({ where: { slug: "counter-strike-2" } });
  if (cs2 && legacy && legacy.id !== cs2.id) {
    await prisma.tournament.updateMany({
      where: { gameId: legacy.id },
      data: { gameId: cs2.id },
    });
    await prisma.game.delete({ where: { id: legacy.id } });
  }
}
