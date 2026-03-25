"use client";

import { TournamentFormat } from "@prisma/client";
import { motion } from "framer-motion";

type BracketMatch = {
  id: string;
  round: number;
  orderInRound: number;
  bracketSegment: string;
  participantA: string | null;
  participantB: string | null;
  scoreA: number;
  scoreB: number;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  winnerLabel: string | null;
};

type Props = {
  format: TournamentFormat;
  matches: BracketMatch[];
};

function statusClass(status: BracketMatch["status"]) {
  if (status === "LIVE") return "border-[#14ffec] bg-[#0d7377]/25";
  if (status === "FINISHED") return "border-[#0d7377] bg-[#323232]";
  return "border-[#323232] bg-[#212121]";
}

export default function TournamentBracket({ format, matches }: Props) {
  const grouped = matches.reduce<Record<number, BracketMatch[]>>((acc, match) => {
    acc[match.round] ??= [];
    acc[match.round].push(match);
    return acc;
  }, {});

  const rounds = Object.keys(grouped)
    .map((n) => Number(n))
    .sort((a, b) => a - b);

  return (
    <section className="mt-6 overflow-x-auto rounded-xl border border-[#323232] bg-[#212121] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-300">Сетка турнира</h2>
        <span className="rounded bg-[#323232] px-2 py-1 text-xs text-[#14ffec]">{format}</span>
      </div>

      <div className="flex min-w-max gap-6 pb-2">
        {rounds.map((round) => (
          <div key={round} className="w-72">
            <h3 className="mb-3 text-xs uppercase tracking-[0.16em] text-zinc-500">Раунд {round}</h3>
            <div className="space-y-3">
              {grouped[round].map((match, idx) => (
                <motion.article
                  key={match.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.28 }}
                  className={`rounded-lg border p-3 ${statusClass(match.status)}`}
                >
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>
                      {match.bracketSegment} / #{match.orderInRound}
                    </span>
                    <span>{match.status}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_auto] gap-2 text-sm text-zinc-100">
                    <span>{match.participantA ?? "TBD"}</span>
                    <span>{match.scoreA}</span>
                    <span>{match.participantB ?? "TBD"}</span>
                    <span>{match.scoreB}</span>
                  </div>
                  {match.winnerLabel && (
                    <p className="mt-2 text-xs uppercase tracking-wider text-[#14ffec]">Winner: {match.winnerLabel}</p>
                  )}
                </motion.article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
