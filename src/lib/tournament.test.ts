import { describe, expect, it } from "vitest";
import {
  calculateMaxParticipants,
  calculatePrizePoolFromEntryFees,
  distributePrizePool,
  isAllowedTeamSize,
  requiredTeammates,
} from "@/lib/tournament";

describe("tournament helpers", () => {
  it("validates allowed team sizes", () => {
    expect(isAllowedTeamSize(1)).toBe(true);
    expect(isAllowedTeamSize(2)).toBe(true);
    expect(isAllowedTeamSize(5)).toBe(true);
    expect(isAllowedTeamSize(3)).toBe(false);
  });

  it("calculates participants from teams and team size", () => {
    expect(calculateMaxParticipants(16, 1)).toBe(16);
    expect(calculateMaxParticipants(16, 2)).toBe(32);
    expect(calculateMaxParticipants(16, 5)).toBe(80);
  });

  it("calculates required teammates", () => {
    expect(requiredTeammates(1)).toBe(0);
    expect(requiredTeammates(2)).toBe(1);
    expect(requiredTeammates(5)).toBe(4);
  });

  it("calculates prize pool (85%) and 50/30/20 split", () => {
    const pool = calculatePrizePoolFromEntryFees(10, 1_000_00);
    expect(pool).toBe(850_000);
    const parts = distributePrizePool(pool);
    expect(parts.first).toBe(425_000);
    expect(parts.second).toBe(255_000);
    expect(parts.third).toBe(170_000);
    expect(parts.first + parts.second + parts.third).toBe(pool);
  });
});

