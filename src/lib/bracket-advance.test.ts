import { describe, expect, it } from "vitest";
import { getNextBracketSlot } from "./bracket-advance";

describe("getNextBracketSlot", () => {
  it("maps upper bracket single elim (1,1)->(2,1) slot A", () => {
    expect(getNextBracketSlot(1, 1)).toEqual({ nextRound: 2, nextOrder: 1, useParticipantA: true });
  });
  it("(1,2)->(2,1) slot B", () => {
    expect(getNextBracketSlot(1, 2)).toEqual({ nextRound: 2, nextOrder: 1, useParticipantA: false });
  });
  it("(2,1)->(3,1) slot A", () => {
    expect(getNextBracketSlot(2, 1)).toEqual({ nextRound: 3, nextOrder: 1, useParticipantA: true });
  });
  it("(2,3)->(3,2) slot A (odd order)", () => {
    expect(getNextBracketSlot(2, 3)).toEqual({ nextRound: 3, nextOrder: 2, useParticipantA: true });
  });
  it("(2,2)->(3,1) slot B (even order)", () => {
    expect(getNextBracketSlot(2, 2)).toEqual({ nextRound: 3, nextOrder: 1, useParticipantA: false });
  });
});
