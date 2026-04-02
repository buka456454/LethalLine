import { describe, expect, it } from "vitest";
import { TournamentFormat } from "@prisma/client";
import { computeTournamentPodium } from "./tournamentPodium";

describe("computeTournamentPodium", () => {
  it("single elim: final + two semis", () => {
    const matches = [
      {
        round: 1,
        orderInRound: 1,
        bracketSegment: "UPPER",
        participantA: "A",
        participantB: "B",
        status: "FINISHED",
        winnerLabel: "A",
      },
      {
        round: 1,
        orderInRound: 2,
        bracketSegment: "UPPER",
        participantA: "C",
        participantB: "D",
        status: "FINISHED",
        winnerLabel: "C",
      },
      {
        round: 2,
        orderInRound: 1,
        bracketSegment: "FINAL",
        participantA: "A",
        participantB: "C",
        status: "FINISHED",
        winnerLabel: "A",
      },
    ];
    const p = computeTournamentPodium(matches, TournamentFormat.SINGLE_ELIMINATION);
    expect(p).not.toBeNull();
    expect(p!.gold).toBe("A");
    expect(p!.silver).toBe("C");
    expect(p!.bronze).toContain("B");
    expect(p!.bronze).toContain("D");
    expect(p!.bronzeCaption).toBe("3–4 место");
  });

  it("round robin: by wins", () => {
    const matches = [
      {
        round: 1,
        orderInRound: 1,
        bracketSegment: "UPPER",
        participantA: "X",
        participantB: "Y",
        status: "FINISHED",
        winnerLabel: "X",
      },
      {
        round: 1,
        orderInRound: 2,
        bracketSegment: "UPPER",
        participantA: "X",
        participantB: "Z",
        status: "FINISHED",
        winnerLabel: "X",
      },
      {
        round: 1,
        orderInRound: 3,
        bracketSegment: "UPPER",
        participantA: "Y",
        participantB: "Z",
        status: "FINISHED",
        winnerLabel: "Z",
      },
    ];
    const p = computeTournamentPodium(matches, TournamentFormat.ROUND_ROBIN);
    expect(p!.gold).toBe("X");
    expect(p!.silver).toBe("Z");
    expect(p!.bronze).toBe("Y");
  });
});
