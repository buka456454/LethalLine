import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@prisma/client";
import { generateDoubleEliminationMatches, generateSingleEliminationMatches } from "@/lib/bracket";

type SeedEntry = {
  label: string;
};

function uniqueByLabel(entries: SeedEntry[]) {
  const seen = new Set<string>();
  const result: SeedEntry[] = [];
  for (const entry of entries) {
    const key = entry.label.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

/** Fisher–Yates. Стартовая сетка обязана быть случайной — не сидим по рейтингу. */
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function nextPowerOfTwo(value: number) {
  if (value <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(value));
}

type FirstRoundPair = {
  participantA: string | null;
  participantB: string | null;
};

function buildFirstRoundPairs(entries: SeedEntry[], bracketSize: number): FirstRoundPair[] {
  const totalMatches = Math.max(1, bracketSize / 2);
  const byes = bracketSize - entries.length;
  const pairs: FirstRoundPair[] = [];
  let cursor = byes;

  for (let i = 0; i < totalMatches; i += 1) {
    if (i < byes && entries[i]) {
      pairs.push({ participantA: entries[i].label, participantB: null });
      continue;
    }
    const participantA = entries[cursor]?.label ?? null;
    const participantB = entries[cursor + 1]?.label ?? null;
    pairs.push({ participantA, participantB });
    cursor += 2;
  }

  return pairs;
}

export async function reseedTournamentBracket(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      registrations: {
        where: { status: "APPROVED" },
        include: { user: true },
      },
      teamApplications: {
        where: { status: "APPROVED" },
        include: { captain: true, members: true },
      },
      matches: {
        orderBy: [{ round: "asc" }, { orderInRound: "asc" }],
      },
    },
  });
  if (!tournament) return;

  const baseEntries: SeedEntry[] =
    tournament.teamSize === 1
      ? [
          ...tournament.registrations.map((r) => ({ label: r.user.username })),
          ...tournament.teamApplications.map((a) => {
            const captainName = a.members.find((m) => m.isCaptain)?.username ?? a.captain.username;
            return { label: captainName };
          }),
        ]
      : tournament.teamApplications.map((a) => ({ label: a.teamName }));

  const entries = shuffle(uniqueByLabel(baseEntries)); // random order, not rating
  const firstRoundMatches = tournament.matches.filter((m) => m.round === 1 && m.bracketSegment !== "LOWER");

  const updates = firstRoundMatches.map((match, index) => {
    const participantA = entries[index * 2]?.label ?? null;
    const participantB = entries[index * 2 + 1]?.label ?? null;
    return prisma.match.update({
      where: { id: match.id },
      data: {
        participantA,
        participantB,
        status: match.status === MatchStatus.FINISHED ? match.status : MatchStatus.SCHEDULED,
        scoreA: match.status === MatchStatus.FINISHED ? match.scoreA : 0,
        scoreB: match.status === MatchStatus.FINISHED ? match.scoreB : 0,
        winnerLabel: match.status === MatchStatus.FINISHED ? match.winnerLabel : null,
      },
    });
  });

  if (updates.length > 0) await prisma.$transaction(updates);
}

export async function regenerateTournamentBracketFromApprovedEntries(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      registrations: {
        where: { status: "APPROVED" },
        include: { user: true },
      },
      teamApplications: {
        where: { status: "APPROVED" },
        include: { captain: true, members: true },
      },
    },
  });
  if (!tournament) return;

  const baseEntries: SeedEntry[] =
    tournament.teamSize === 1
      ? [
          ...tournament.registrations.map((r) => ({ label: r.user.username })),
          ...tournament.teamApplications.map((a) => {
            const captainName = a.members.find((m) => m.isCaptain)?.username ?? a.captain.username;
            return { label: captainName };
          }),
        ]
      : tournament.teamApplications.map((a) => ({ label: a.teamName }));

  const entries = shuffle(uniqueByLabel(baseEntries)); // random order, not rating
  if (entries.length < 2) {
    await prisma.match.deleteMany({ where: { tournamentId } });
    return;
  }

  const bracketSize = nextPowerOfTwo(entries.length);
  const seedMatches =
    tournament.format === "DOUBLE_ELIMINATION"
      ? generateDoubleEliminationMatches(bracketSize)
      : generateSingleEliminationMatches(bracketSize);

  const firstRoundPairs = buildFirstRoundPairs(entries, bracketSize);
  const upperOrFinalFirstRound = seedMatches.filter((m) => m.round === 1 && m.bracketSegment !== "LOWER");
  let pairCursor = 0;

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { tournamentId } });
    for (const seed of seedMatches) {
      const pair = seed.round === 1 && seed.bracketSegment !== "LOWER" ? firstRoundPairs[pairCursor++] : undefined;
      await tx.match.create({
        data: {
          tournamentId,
          round: seed.round,
          orderInRound: seed.orderInRound,
          bracketSegment: seed.bracketSegment,
          participantA: pair?.participantA ?? null,
          participantB: pair?.participantB ?? null,
          status: MatchStatus.SCHEDULED,
          scoreA: 0,
          scoreB: 0,
          winnerLabel: null,
        },
      });
    }

    const created = await tx.match.findMany({
      where: { tournamentId },
      orderBy: [{ round: "asc" }, { orderInRound: "asc" }],
    });

    const map = new Map(created.map((m) => [`${m.round}:${m.orderInRound}:${m.bracketSegment}`, m]));
    for (const match of created) {
      if (match.bracketSegment === "LOWER") continue;
      const hasA = Boolean(match.participantA?.trim());
      const hasB = Boolean(match.participantB?.trim());
      if (hasA === hasB) continue;

      const winnerLabel = (match.participantA ?? match.participantB)?.trim() ?? null;
      if (!winnerLabel) continue;

      await tx.match.update({
        where: { id: match.id },
        data: {
          status: MatchStatus.FINISHED,
          winnerLabel,
          scoreA: hasA ? 1 : 0,
          scoreB: hasB ? 1 : 0,
        },
      });

      const nextRound = match.round + 1;
      const nextOrder = Math.ceil(match.orderInRound / 2);
      const useParticipantA = match.orderInRound % 2 === 1;
      const next =
        map.get(`${nextRound}:${nextOrder}:${match.bracketSegment}`) ??
        (match.bracketSegment === "UPPER" ? map.get(`${nextRound}:${nextOrder}:FINAL`) : undefined);
      if (!next) continue;

      await tx.match.update({
        where: { id: next.id },
        data: useParticipantA ? { participantA: winnerLabel } : { participantB: winnerLabel },
      });
    }
  });
}

