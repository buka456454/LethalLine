import { describe, expect, it } from "vitest";
import { generateDoubleEliminationMatches, generateSingleEliminationMatches } from "@/lib/bracket";
import {
  CARD_H,
  CARD_W,
  ROW_GAP,
  cullNodes,
  layoutBracket,
  rectsIntersect,
  worldViewRect,
} from "@/lib/bracket-layout";
import type { BracketMatch } from "@/lib/bracket-types";

function asMatches(
  seeds: Array<{ round: number; orderInRound: number; bracketSegment: string }>,
): BracketMatch[] {
  return seeds.map((seed, index) => ({
    id: `${seed.bracketSegment}-${seed.round}-${seed.orderInRound}`,
    round: seed.round,
    orderInRound: seed.orderInRound,
    bracketSegment: seed.bracketSegment,
    participantA: index === 0 ? "A" : null,
    participantB: index === 0 ? "B" : null,
    scoreA: 0,
    scoreB: 0,
    status: "SCHEDULED",
    winnerLabel: index === 0 ? "A" : null,
  }));
}

describe("layoutBracket single elimination", () => {
  it("places 8-player SE as a centered tree with feeder edges", () => {
    const layout = layoutBracket(asMatches(generateSingleEliminationMatches(8)), "SINGLE_ELIMINATION");
    expect(layout.nodes).toHaveLength(7);

    const r1 = layout.nodes.filter((n) => n.match.round === 1).sort((a, b) => a.match.orderInRound - b.match.orderInRound);
    const r2 = layout.nodes.filter((n) => n.match.round === 2).sort((a, b) => a.match.orderInRound - b.match.orderInRound);
    const final = layout.nodes.find((n) => n.match.bracketSegment === "FINAL");
    expect(r1).toHaveLength(4);
    expect(r2).toHaveLength(2);
    expect(final).toBeTruthy();

    const stride0 = CARD_H + ROW_GAP;
    expect(r1[1]!.y - r1[0]!.y).toBe(stride0);

    const childMid = (r1[0]!.y + r1[0]!.h / 2 + (r1[1]!.y + r1[1]!.h / 2)) / 2;
    expect(r2[0]!.y + r2[0]!.h / 2).toBe(childMid);

    const parentMid = (r2[0]!.y + r2[0]!.h / 2 + (r2[1]!.y + r2[1]!.h / 2)) / 2;
    expect(final!.y + final!.h / 2).toBe(parentMid);

    expect(r2[0]!.x).toBeGreaterThan(r1[0]!.x);
    expect(final!.x).toBeGreaterThan(r2[0]!.x);

    expect(layout.edges).toHaveLength(6);
    expect(layout.edges.some((e) => e.fromId === r1[0]!.id && e.toId === r2[0]!.id)).toBe(true);
    expect(layout.edges.some((e) => e.fromId === r2[0]!.id && e.toId === final!.id)).toBe(true);
    expect(layout.edges.find((e) => e.fromId === r1[0]!.id)?.winner).toBe(true);
  });
});

describe("layoutBracket double elimination", () => {
  it("keeps UPPER, LOWER and FINAL in separate non-overlapping bands", () => {
    const layout = layoutBracket(asMatches(generateDoubleEliminationMatches(8)), "DOUBLE_ELIMINATION");
    const upper = layout.nodes.filter((n) => n.match.bracketSegment === "UPPER");
    const lower = layout.nodes.filter((n) => n.match.bracketSegment === "LOWER");
    const finals = layout.nodes.filter((n) => n.match.bracketSegment === "FINAL");

    expect(upper.length).toBeGreaterThan(0);
    expect(lower.length).toBeGreaterThan(0);
    expect(finals).toHaveLength(1);

    const upperMaxY = Math.max(...upper.map((n) => n.y + n.h));
    const lowerMinY = Math.min(...lower.map((n) => n.y));
    expect(lowerMinY).toBeGreaterThan(upperMaxY);

    const treeMaxX = Math.max(...[...upper, ...lower].map((n) => n.x + n.w));
    expect(finals[0]!.x).toBeGreaterThan(treeMaxX);

    const upperToFinal = layout.edges.filter(
      (e) =>
        upper.some((n) => n.id === e.fromId) && finals.some((n) => n.id === e.toId),
    );
    expect(upperToFinal.length).toBeGreaterThan(0);
    expect(layout.edges.every((e) => e.x2 >= e.x1)).toBe(true);
  });
});

describe("layoutBracket round robin", () => {
  it("stacks matches by round without feeder edges", () => {
    const matches = asMatches([
      { round: 1, orderInRound: 1, bracketSegment: "UPPER" },
      { round: 1, orderInRound: 2, bracketSegment: "UPPER" },
      { round: 2, orderInRound: 1, bracketSegment: "UPPER" },
    ]);
    const layout = layoutBracket(matches, "ROUND_ROBIN");
    expect(layout.edges).toHaveLength(0);
    const r1 = layout.nodes.filter((n) => n.match.round === 1);
    const r2 = layout.nodes.filter((n) => n.match.round === 2);
    expect(r1[1]!.y).toBeGreaterThan(r1[0]!.y);
    expect(r2[0]!.x).toBeGreaterThan(r1[0]!.x);
  });
});

describe("culling", () => {
  it("keeps only nodes that intersect the world view", () => {
    const layout = layoutBracket(asMatches(generateSingleEliminationMatches(8)), "SINGLE_ELIMINATION");
    const view = { x: layout.nodes[0]!.x - 4, y: layout.nodes[0]!.y - 4, w: CARD_W + 8, h: CARD_H + 8 };
    const visible = cullNodes(layout.nodes, view);
    expect(visible.length).toBeGreaterThanOrEqual(1);
    expect(visible.length).toBeLessThan(layout.nodes.length);
    expect(visible.some((n) => n.id === layout.nodes[0]!.id)).toBe(true);
  });

  it("worldViewRect expands the camera viewport by a buffer", () => {
    const view = worldViewRect({ x: 0, y: 0, scale: 1 }, { w: 100, h: 80 }, 10);
    expect(view.x).toBe(-10);
    expect(view.y).toBe(-10);
    expect(view.w).toBe(120);
    expect(view.h).toBe(100);
    expect(rectsIntersect(view, { x: 0, y: 0, w: 10, h: 10 })).toBe(true);
    expect(rectsIntersect(view, { x: 400, y: 400, w: 10, h: 10 })).toBe(false);
  });
});
