import { MatchStatus, TournamentFormat } from "@prisma/client";

export type MatchForPodium = {
  round: number;
  orderInRound: number;
  bracketSegment: string;
  participantA: string | null;
  participantB: string | null;
  status: MatchStatus | string;
  winnerLabel: string | null;
};

export type PodiumResult = {
  gold: string;
  silver: string;
  bronze: string | null;
  /** Подпись под бронзой (например, делёж 3–4 места) */
  bronzeCaption?: string;
};

function loserOf(match: MatchForPodium): string | null {
  const w = match.winnerLabel;
  if (!w) return null;
  if (w === match.participantA) return match.participantB;
  if (w === match.participantB) return match.participantA;
  return null;
}

function computeRoundRobinPodium(matches: MatchForPodium[]): PodiumResult | null {
  const finished = matches.filter((m) => m.status === "FINISHED" && m.winnerLabel);
  if (finished.length === 0) return null;

  const wins: Record<string, number> = {};
  for (const m of matches) {
    if (m.participantA) wins[m.participantA] = wins[m.participantA] ?? 0;
    if (m.participantB) wins[m.participantB] = wins[m.participantB] ?? 0;
  }
  for (const m of finished) {
    const w = m.winnerLabel!;
    wins[w] = (wins[w] ?? 0) + 1;
  }

  const ranked = Object.entries(wins).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"));
  if (ranked.length === 0) return null;

  return {
    gold: ranked[0]![0],
    silver: ranked[1]?.[0] ?? "—",
    bronze: ranked[2]?.[0] ?? null,
  };
}

/**
 * Оценка топ-3 по сетке (финал + полуфиналы верхней сетки) или по победам в round robin.
 */
export function computeTournamentPodium(
  matches: MatchForPodium[],
  format: TournamentFormat,
): PodiumResult | null {
  if (matches.length === 0) return null;

  if (format === "ROUND_ROBIN") {
    return computeRoundRobinPodium(matches);
  }

  const maxRound = Math.max(0, ...matches.map((m) => m.round));
  if (maxRound < 1) return null;

  const finals = matches.filter((m) => m.round === maxRound && m.status === "FINISHED" && m.winnerLabel);
  if (finals.length === 0) return null;

  const finalMatch =
    finals.find((m) => m.bracketSegment === "FINAL") ?? finals.sort((a, b) => b.orderInRound - a.orderInRound)[0];

  if (!finalMatch?.winnerLabel) return null;

  const gold = finalMatch.winnerLabel;
  const silver = loserOf(finalMatch) ?? "—";

  const semiRound = maxRound - 1;
  if (semiRound < 1) {
    return { gold, silver, bronze: null };
  }

  const semis = matches.filter(
    (m) =>
      m.round === semiRound &&
      m.status === "FINISHED" &&
      m.winnerLabel &&
      m.bracketSegment !== "LOWER",
  );

  const semiLosers: string[] = [];
  for (const m of semis) {
    const l = loserOf(m);
    if (l) semiLosers.push(l);
  }

  if (semiLosers.length === 0) {
    return { gold, silver, bronze: null };
  }

  if (semiLosers.length === 1) {
    return { gold, silver, bronze: semiLosers[0]! };
  }

  const bronze = [...new Set(semiLosers)].sort((a, b) => a.localeCompare(b, "ru")).join(" · ");
  return { gold, silver, bronze, bronzeCaption: "3–4 место" };
}
