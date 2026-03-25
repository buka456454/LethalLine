import { describe, expect, it } from "vitest";
import { generateDoubleEliminationMatches, generateSingleEliminationMatches } from "@/lib/bracket";

describe("bracket generation", () => {
  it("creates single elimination rounds", () => {
    const matches = generateSingleEliminationMatches(8);
    expect(matches.length).toBe(7);
    expect(matches[0].round).toBe(1);
    expect(matches.at(-1)?.bracketSegment).toBe("FINAL");
  });

  it("creates double elimination by combining upper and lower", () => {
    const matches = generateDoubleEliminationMatches(8);
    const lower = matches.filter((m) => m.bracketSegment === "LOWER");
    expect(lower.length).toBeGreaterThan(0);
    expect(matches.length).toBeGreaterThan(generateSingleEliminationMatches(8).length);
  });
});
