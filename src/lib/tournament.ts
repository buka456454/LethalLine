export const ALLOWED_TEAM_SIZES = [1, 2, 5] as const;

export function isAllowedTeamSize(value: number): value is (typeof ALLOWED_TEAM_SIZES)[number] {
  return ALLOWED_TEAM_SIZES.includes(value as (typeof ALLOWED_TEAM_SIZES)[number]);
}

export function calculateMaxParticipants(maxTeams: number, teamSize: number) {
  return maxTeams * teamSize;
}

export function requiredTeammates(teamSize: number) {
  return Math.max(0, teamSize - 1);
}

export function calculatePrizePoolFromEntryFees(maxTeams: number, entryFeeMinor: number) {
  return Math.floor(maxTeams * entryFeeMinor * 0.85);
}

export function distributePrizePool(poolMinor: number) {
  const first = Math.floor(poolMinor * 0.5);
  const second = Math.floor(poolMinor * 0.3);
  const third = poolMinor - first - second;
  return { first, second, third };
}

