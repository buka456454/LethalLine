import { ok, fail } from "@/lib/api";
import { readSession } from "@/lib/auth";
import { isNotPlayed, NOT_PLAYED_VALUE, normalizeNumericRange } from "@/lib/gameQuestionnaireConfig";
import { getFriendRelation, type FriendRelation } from "@/lib/friends";
import { prisma } from "@/lib/prisma";

function toNullableTrimmed(value: string | null): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toNullableInt(value: string | null): number | undefined {
  if (value == null) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) return undefined;
  return parsed;
}

function toPrismaIntRange(min?: number, max?: number) {
  if (min == null && max == null) return undefined;
  return {
    ...(min != null ? { gte: min } : {}),
    ...(max != null ? { lte: max } : {}),
  };
}

export async function GET(request: Request) {
  try {
    const session = await readSession();
    const url = new URL(request.url);
    const gameId = toNullableTrimmed(url.searchParams.get("gameId"));
    const gameSlug = toNullableTrimmed(url.searchParams.get("gameSlug"));
    const role = toNullableTrimmed(url.searchParams.get("role"));
    const experience = toNullableTrimmed(url.searchParams.get("experience"));
    const hours = normalizeNumericRange(
      toNullableInt(url.searchParams.get("minHours")),
      toNullableInt(url.searchParams.get("maxHours")),
    );
    const mmr = normalizeNumericRange(
      toNullableInt(url.searchParams.get("minMmr")),
      toNullableInt(url.searchParams.get("maxMmr")),
    );
    const hoursPlayed = toPrismaIntRange(hours.min, hours.max);
    const mmrRange = toPrismaIntRange(mmr.min, mmr.max);
    const take = Math.min(100, toNullableInt(url.searchParams.get("take")) ?? 50);
    const hasProfileFilters = Boolean(
      gameId || gameSlug || role || experience || hoursPlayed || mmrRange,
    );

    const users = await prisma.user.findMany({
      where: {
        isBanned: false,
        ...(session ? { id: { not: session.sub } } : {}),
        ...(hasProfileFilters
          ? {
              gameProfiles: {
                some: {
                  NOT: { rankLabel: NOT_PLAYED_VALUE },
                  ...(gameId ? { gameId } : {}),
                  ...(gameSlug ? { game: { slug: gameSlug } } : {}),
                  ...(role ? { primaryRole: { contains: role, mode: "insensitive" } } : {}),
                  ...(experience
                    ? {
                        OR: [
                          { rankLabel: { contains: experience, mode: "insensitive" } },
                          { primaryRole: { contains: experience, mode: "insensitive" } },
                        ],
                      }
                    : {}),
                  ...(hoursPlayed ? { hoursPlayed } : {}),
                  ...(mmrRange ? { mmr: mmrRange } : {}),
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        username: true,
        role: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        gameProfiles: {
          include: { game: { select: { id: true, name: true, slug: true } } },
          orderBy: { game: { name: "asc" } },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    const relations = new Map<string, FriendRelation>();
    if (session && users.length > 0) {
      await Promise.all(
        users.map(async (u) => {
          relations.set(u.id, await getFriendRelation(session.sub, u.id));
        }),
      );
    }

    return ok({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        friendRelation: relations.get(u.id) ?? { kind: "none" as const },
        gameProfiles: u.gameProfiles
          .filter((p) => !isNotPlayed(p.rankLabel))
          .map((p) => ({
            gameId: p.gameId,
            game: p.game,
            mmr: p.mmr,
            rankLabel: p.rankLabel,
            hoursPlayed: p.hoursPlayed,
            primaryRole: p.primaryRole,
          })),
      })),
    });
  } catch {
    return fail("Не удалось загрузить список напарников", 500);
  }
}
