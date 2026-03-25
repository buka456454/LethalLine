type SeedMatch = {
  round: number;
  orderInRound: number;
  bracketSegment: "UPPER" | "LOWER" | "FINAL";
};

export function generateSingleEliminationMatches(maxParticipants: number): SeedMatch[] {
  const rounds = Math.ceil(Math.log2(maxParticipants));
  const matches: SeedMatch[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    const total = Math.max(1, Math.floor(maxParticipants / 2 ** round));
    for (let order = 1; order <= total; order += 1) {
      matches.push({
        round,
        orderInRound: order,
        bracketSegment: round === rounds ? "FINAL" : "UPPER",
      });
    }
  }

  return matches;
}

export function generateDoubleEliminationMatches(maxParticipants: number): SeedMatch[] {
  const upper = generateSingleEliminationMatches(maxParticipants).map((item) => ({
    ...item,
    bracketSegment: item.bracketSegment === "FINAL" ? ("FINAL" as const) : ("UPPER" as const),
  }));
  const lower = upper
    .filter((item) => item.bracketSegment === "UPPER")
    .map((item) => ({
      ...item,
      bracketSegment: "LOWER" as const,
      orderInRound: item.orderInRound,
    }));
  return [...upper, ...lower];
}
