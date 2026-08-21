"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import ParticipantAvatar from "@/components/ui/ParticipantAvatar";
import type { BracketMatch, ParticipantRoster } from "@/lib/bracket-types";
import { cn } from "@/lib/cn";

function statusClass(status: BracketMatch["status"]) {
  if (status === "LIVE") return "ll-bracket-live border-[#14ffec] bg-[#0d7377]/25";
  if (status === "FINISHED") return "border-[#0d7377] bg-[#323232]";
  return "border-[#323232] bg-[#212121]";
}

function isWinner(match: BracketMatch, label: string | null) {
  if (!label || !match.winnerLabel) return false;
  return match.winnerLabel.trim().toLowerCase() === label.trim().toLowerCase();
}

function ParticipantRow({
  match,
  side,
  roster,
  expanded,
  onToggle,
}: {
  match: BracketMatch;
  side: "A" | "B";
  roster?: ParticipantRoster;
  expanded: boolean;
  onToggle: () => void;
}) {
  const label = side === "A" ? match.participantA : match.participantB;
  const score = side === "A" ? match.scoreA : match.scoreB;
  const winner = isWinner(match, label);
  const members = roster?.members ?? (label ? [{ username: label, isCaptain: roster?.kind !== "team" }] : []);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={!label}
        onClick={(event) => {
          event.stopPropagation();
          if (label) onToggle();
        }}
        className={cn(
          "grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded px-0.5 py-0.5 text-left text-sm",
          label ? "hover:bg-black/25" : "cursor-default",
          winner && "text-[#14ffec]",
        )}
      >
        {label ? (
          <span className="inline-flex min-w-0 items-center gap-2">
            <ParticipantAvatar label={label} logoUrl={roster?.logoUrl} size={20} />
            <span className="truncate font-medium uppercase tracking-[0.04em]">{label}</span>
          </span>
        ) : (
          <span className="text-zinc-500">TBD</span>
        )}
        <span className={cn("tabular-nums text-zinc-300", winner && "text-[#14ffec]")}>{score}</span>
      </button>
      <AnimatePresence>
        {expanded && label ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-full z-30 overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mt-1 rounded border border-[#14ffec]/40 bg-[#141414] p-2 shadow-[0_12px_32px_-16px_rgba(20,255,236,0.45)]">
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                {roster?.kind === "team" ? "Состав" : "Игрок"}
              </p>
              <ul className="mt-1 space-y-1">
                {members.map((member) => (
                  <li key={member.username} className="flex items-center justify-between gap-2 text-xs text-zinc-200">
                    <Link
                      href={`/u/${encodeURIComponent(member.username)}`}
                      className="text-[#14ffec] underline decoration-[#323232] hover:decoration-[#14ffec]"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {member.username}
                    </Link>
                    {member.isCaptain && roster?.kind === "team" ? (
                      <span className="uppercase tracking-wider text-zinc-500">капитан</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function BracketMatchCard({
  match,
  rosterA,
  rosterB,
  highlighted,
  selected,
  expandedSide,
  onToggleSide,
  onSelect,
  appear,
}: {
  match: BracketMatch;
  rosterA?: ParticipantRoster;
  rosterB?: ParticipantRoster;
  highlighted?: boolean;
  selected?: boolean;
  expandedSide: "A" | "B" | null;
  onToggleSide: (side: "A" | "B") => void;
  onSelect: () => void;
  appear?: boolean;
}) {
  return (
    <motion.article
      initial={appear ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative box-border h-full w-full overflow-visible rounded-lg border p-2.5",
        statusClass(match.status),
        highlighted && "ring-2 ring-[#14ffec] ring-offset-1 ring-offset-[#141414]",
        selected && "border-[#14ffec]",
        expandedSide ? "z-20" : highlighted ? "z-10" : "z-0",
      )}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        <span>
          {match.bracketSegment} / #{match.orderInRound}
        </span>
        <span className={cn(match.status === "LIVE" && "text-[#14ffec]")}>{match.status}</span>
      </div>
      <ParticipantRow
        match={match}
        side="A"
        roster={rosterA}
        expanded={expandedSide === "A"}
        onToggle={() => onToggleSide("A")}
      />
      <ParticipantRow
        match={match}
        side="B"
        roster={rosterB}
        expanded={expandedSide === "B"}
        onToggle={() => onToggleSide("B")}
      />
    </motion.article>
  );
}
