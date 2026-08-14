import { CORE_GAMES } from "@/lib/gameAssets";
import { prisma } from "@/lib/prisma";

/** Устаревший слаг -> канонический слаг из CORE_GAMES. */
const LEGACY_SLUG_MERGES: Record<string, string> = {
  "counter-strike-2": "cs2",
  dota2: "dota-2",
  "dota-2-1": "dota-2",
};

async function mergeLegacyGame(legacySlug: string, canonicalSlug: string) {
  const [legacy, canonical] = await Promise.all([
    prisma.game.findUnique({ where: { slug: legacySlug } }),
    prisma.game.findUnique({ where: { slug: canonicalSlug } }),
  ]);
  if (!legacy || !canonical || legacy.id === canonical.id) return;

  await prisma.tournament.updateMany({
    where: { gameId: legacy.id },
    data: { gameId: canonical.id },
  });

  // UserGameProfile уникален по (userId, gameId): переносим только тех,
  // у кого ещё нет анкеты по каноничной игре, остальные уйдут каскадом при delete.
  const legacyProfiles = await prisma.userGameProfile.findMany({
    where: { gameId: legacy.id },
    select: { id: true, userId: true },
  });
  if (legacyProfiles.length > 0) {
    const alreadyFilled = await prisma.userGameProfile.findMany({
      where: { gameId: canonical.id, userId: { in: legacyProfiles.map((p) => p.userId) } },
      select: { userId: true },
    });
    const taken = new Set(alreadyFilled.map((p) => p.userId));
    const movableIds = legacyProfiles.filter((p) => !taken.has(p.userId)).map((p) => p.id);
    if (movableIds.length > 0) {
      await prisma.userGameProfile.updateMany({
        where: { id: { in: movableIds } },
        data: { gameId: canonical.id },
      });
    }
  }

  await prisma.game.delete({ where: { id: legacy.id } });
}

/** Idempotent: ensures Valorant, Dota 2, CS2 exist. Merges legacy duplicate slugs into canonical ones. */
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

  for (const [legacySlug, canonicalSlug] of Object.entries(LEGACY_SLUG_MERGES)) {
    await mergeLegacyGame(legacySlug, canonicalSlug);
  }
}
