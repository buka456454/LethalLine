import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@prisma/client";

/**
 * Single/double elimination upper path: match (r, o) feeds (r+1, ceil(o/2)).
 * Odd o -> participantA, even o -> participantB.
 */
export function getNextBracketSlot(round: number, orderInRound: number) {
  const nextRound = round + 1;
  const nextOrder = Math.ceil(orderInRound / 2);
  const useParticipantA = orderInRound % 2 === 1;
  return { nextRound, nextOrder, useParticipantA };
}

function normalizeLabel(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

/**
 * After a match is finished, place winner into the next-round match slot.
 */
export async function advanceWinnerToNextMatch(matchId: string, winnerLabel: string | null) {
  if (!winnerLabel?.trim()) return;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return;
  if (match.status !== MatchStatus.FINISHED) return;

  const w = normalizeLabel(winnerLabel);
  const a = normalizeLabel(match.participantA);
  const b = normalizeLabel(match.participantB);
  if (w !== a && w !== b) return;

  const { nextRound, nextOrder, useParticipantA } = getNextBracketSlot(match.round, match.orderInRound);

  const candidates = await prisma.match.findMany({
    where: {
      tournamentId: match.tournamentId,
      round: nextRound,
      orderInRound: nextOrder,
    },
  });

  if (candidates.length === 0) return;

  let next = candidates.find((m) => m.bracketSegment === match.bracketSegment) ?? null;
  if (!next && match.bracketSegment === "UPPER") {
    next = candidates.find((m) => m.bracketSegment === "FINAL") ?? null;
  }
  if (!next && candidates.length === 1) next = candidates[0];
  if (!next) return;

  const data = useParticipantA ? { participantA: winnerLabel.trim() } : { participantB: winnerLabel.trim() };

  await prisma.match.update({
    where: { id: next.id },
    data,
  });
}
