"use client";

import type { BracketMatch, BracketMatchStatus } from "@/lib/bracket-types";
import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

export default function BracketInspector({
  match,
  busy,
  error,
  onClose,
  onSave,
}: {
  match: BracketMatch;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: {
    scoreA: number;
    scoreB: number;
    status: BracketMatchStatus;
    winnerLabel?: string;
  }) => void;
}) {
  const [scoreA, setScoreA] = useState(String(match.scoreA));
  const [scoreB, setScoreB] = useState(String(match.scoreB));
  const [status, setStatus] = useState<BracketMatchStatus>(match.status);
  const [winnerLabel, setWinnerLabel] = useState(match.winnerLabel ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setScoreA(String(match.scoreA));
    setScoreB(String(match.scoreB));
    setStatus(match.status);
    setWinnerLabel(match.winnerLabel ?? "");
    setLocalError(null);
  }, [match]);

  const submit = () => {
    const nextA = Number(scoreA);
    const nextB = Number(scoreB);
    if (!Number.isInteger(nextA) || !Number.isInteger(nextB) || nextA < 0 || nextB < 0 || nextA > 99 || nextB > 99) {
      setLocalError("Счёт — целые числа от 0 до 99");
      return;
    }
    if (status === "FINISHED") {
      if (!match.participantA || !match.participantB) {
        setLocalError("Оба участника должны быть известны");
        return;
      }
      if (!winnerLabel) {
        setLocalError("Выберите победителя");
        return;
      }
    }
    setLocalError(null);
    onSave({
      scoreA: nextA,
      scoreB: nextB,
      status,
      winnerLabel: status === "FINISHED" ? winnerLabel : undefined,
    });
  };

  return (
    <aside
      className={cn(
        "z-40 flex flex-col border-[#323232] bg-[#141414]/95 p-4 backdrop-blur-sm",
        "fixed inset-x-0 bottom-0 max-h-[70vh] rounded-t-xl border-t",
        "md:absolute md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-80 md:rounded-none md:border-l md:border-t-0",
      )}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#14ffec]">Матч</h3>
        <button type="button" className="text-xs uppercase tracking-wider text-zinc-400 hover:text-[#14ffec]" onClick={onClose}>
          Закрыть
        </button>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        {match.bracketSegment} · раунд {match.round} · #{match.orderInRound}
      </p>

      <label className="mt-4 text-[10px] uppercase tracking-[0.14em] text-zinc-500">Счёт</label>
      <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <input
          className="input-base text-center tabular-nums"
          inputMode="numeric"
          value={scoreA}
          onChange={(event) => setScoreA(event.target.value)}
          aria-label="Счёт A"
        />
        <span className="text-zinc-500">:</span>
        <input
          className="input-base text-center tabular-nums"
          inputMode="numeric"
          value={scoreB}
          onChange={(event) => setScoreB(event.target.value)}
          aria-label="Счёт B"
        />
      </div>
      <p className="mt-1 truncate text-xs text-zinc-400">{match.participantA ?? "TBD"} — {match.participantB ?? "TBD"}</p>

      <label className="mt-4 text-[10px] uppercase tracking-[0.14em] text-zinc-500">Статус</label>
      <select className="input-base mt-1" value={status} onChange={(event) => setStatus(event.target.value as BracketMatchStatus)}>
        <option value="SCHEDULED">SCHEDULED</option>
        <option value="LIVE">LIVE</option>
        <option value="FINISHED">FINISHED</option>
      </select>

      <label className="mt-4 text-[10px] uppercase tracking-[0.14em] text-zinc-500">Победитель</label>
      <select className="input-base mt-1" value={winnerLabel} onChange={(event) => setWinnerLabel(event.target.value)}>
        <option value="">Не выбран</option>
        {match.participantA ? <option value={match.participantA}>{match.participantA}</option> : null}
        {match.participantB ? <option value={match.participantB}>{match.participantB}</option> : null}
      </select>

      {(localError || error) && <p className="mt-3 text-xs text-red-400">{localError ?? error}</p>}

      <button type="button" className="button-primary mt-4 w-full uppercase" disabled={busy} onClick={submit}>
        {busy ? "Сохранение…" : "Сохранить"}
      </button>
    </aside>
  );
}
