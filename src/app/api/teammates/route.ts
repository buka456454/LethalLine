import { ok, fail } from "@/lib/api";
import { readSession } from "@/lib/auth";
import { isNotPlayed, NOT_PLAYED_VALUE } from "@/lib/gameQuestionnaireConfig";
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

export async function GET(request: Request) {
  try {
    const session = await readSession();
    const url = new URL(request.url);
    const gameId = toNullableTrimmed(url.searchParams.get("gameId"));
    const gameSlug = toNullableTrimmed(url.searchParams.get("gameSlug"));
    const role = toNullableTrimmed(url.searchParams.get("role"));
    const experience = toNullableTrimmed(url.searchParams.get("experience"));
    const minHours = toNullableInt(url.searchParams.get("minHours"));
    const minMmr = toNullableInt(url.searchParams.get("minMmr"));
    const take = Math.min(100, toNullableInt(url.searchParams.get("take")) ?? 50);

    const users = await prisma.user.findMany({
      where: {
        isBanned: false,
        ...(session ? { id: { not: session.sub } } : {}),
        ...(gameId || gameSlug || role || experience || minHours != null || minMmr != null
          ? {
              gameProfiles: {
                some: {
                  // «Нет опыта» не должен считаться совпадением по дисциплине.
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
                  ...(minHours != null ? { hoursPlayed: { gte: minHours } } : {}),
                  ...(minMmr != null ? { mmr: { gte: minMmr } } : {}),
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

    return ok({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
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
