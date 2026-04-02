"use client";

import { TournamentFormat } from "@prisma/client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import PublicImage from "@/components/ui/PublicImage";

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
  canEdit?: boolean;
  participantAssets?: Record<string, { logoUrl?: string | null }>;
  /** Имена участников (username на сайте), для которых показываем ссылку на профиль */
  linkableUsernames?: string[];
};

function statusClass(status: BracketMatch["status"]) {
  if (status === "LIVE") return "border-[#14ffec] bg-[#0d7377]/25";
  if (status === "FINISHED") return "border-[#0d7377] bg-[#323232]";
  return "border-[#323232] bg-[#212121]";
}

function ParticipantCell({
  label,
  assets,
  linkSet,
}: {
  label: string | null;
  assets: Record<string, { logoUrl?: string | null }>;
  linkSet: Set<string>;
}) {
  if (!label) return <span className="text-zinc-500">TBD</span>;
  const logo = assets[label]?.logoUrl;
  const inner = (
    <span className="inline-flex items-center gap-2">
      {logo && <PublicImage src={logo} alt={label} className="h-5 w-5 rounded object-cover" width={20} height={20} />}
      {linkSet.has(label) ? (
        <Link href={`/u/${encodeURIComponent(label)}`} className="text-[#14ffec] underline decoration-[#323232] hover:decoration-[#14ffec]">
          {label}
        </Link>
      ) : (
        label
      )}
    </span>
  );
  return inner;
}

export default function TournamentBracket({
  format,
  matches,
  canEdit = false,
  participantAssets = {},
  linkableUsernames = [],
}: Props) {
  const router = useRouter();
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null);
  const linkSet = useMemo(() => new Set(linkableUsernames), [linkableUsernames]);
  const grouped = matches.reduce<Record<number, BracketMatch[]>>((acc, match) => {
    acc[match.round] ??= [];
    acc[match.round].push(match);
    return acc;
  }, {});

  const rounds = Object.keys(grouped)
    .map((n) => Number(n))
    .sort((a, b) => a - b);

  const applyWinner = async (match: BracketMatch, winnerLabel: string) => {
    setBusyMatchId(match.id);
    const isA = winnerLabel === (match.participantA ?? "");
    const response = await fetch(`/api/admin/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scoreA: isA ? 1 : 0,
        scoreB: isA ? 0 : 1,
        status: "FINISHED",
        winnerLabel,
      }),
    });
    setBusyMatchId(null);
    if (response.ok) router.refresh();
  };

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
                    <ParticipantCell label={match.participantA} assets={participantAssets} linkSet={linkSet} />
                    <span>{match.scoreA}</span>
                    <ParticipantCell label={match.participantB} assets={participantAssets} linkSet={linkSet} />
                    <span>{match.scoreB}</span>
                  </div>
                  {match.winnerLabel && (
                    <p className="mt-2 text-xs uppercase tracking-wider text-[#14ffec]">Winner: {match.winnerLabel}</p>
                  )}
                  {canEdit && match.participantA && match.participantB && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={busyMatchId === match.id}
                        className="rounded border border-[#323232] bg-[#212121] px-2 py-1 text-xs text-zinc-200 hover:text-[#14ffec]"
                        onClick={() => void applyWinner(match, match.participantA!)}
                      >
                        Победитель A
                      </button>
                      <button
                        type="button"
                        disabled={busyMatchId === match.id}
                        className="rounded border border-[#323232] bg-[#212121] px-2 py-1 text-xs text-zinc-200 hover:text-[#14ffec]"
                        onClick={() => void applyWinner(match, match.participantB!)}
                      >
                        Победитель B
                      </button>
                    </div>
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
