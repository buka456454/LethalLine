"use client";

import { useEffect, useMemo, useState } from "react";

type TournamentItem = { id: string; title: string };

export default function MatchCreateManager() {
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState({
    tournamentId: "",
    round: "1",
    orderInRound: "1",
    bracketSegment: "UPPER",
    scheduledAt: "",
  });

  useEffect(() => {
    const loadTournaments = async () => {
      const response = await fetch("/api/admin/overview");
      const body = (await response.json()) as { tournaments?: TournamentItem[] };
      setTournaments(body.tournaments ?? []);
    };
    void loadTournaments();
  }, []);

  const scheduledAtIso = useMemo(() => {
    if (!state.scheduledAt) return null;
    const date = new Date(state.scheduledAt);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }, [state.scheduledAt]);

  const createMatch = async () => {
    setMessage("");
    if (!state.tournamentId) return setMessage("Выбери турнир");
    const round = Number(state.round);
    const orderInRound = Number(state.orderInRound);
    if (!Number.isInteger(round) || round < 1 || round > 64) return setMessage("Раунд должен быть от 1 до 64");
    if (!Number.isInteger(orderInRound) || orderInRound < 1 || orderInRound > 256) {
      return setMessage("Порядок в раунде должен быть от 1 до 256");
    }

    setSubmitting(true);
    const response = await fetch("/api/admin/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournamentId: state.tournamentId,
        round,
        orderInRound,
        bracketSegment: state.bracketSegment,
        scheduledAt: scheduledAtIso,
      }),
    });
    const body = (await response.json()) as { error?: string; match?: { id: string } };
    if (!response.ok) {
      setMessage(body.error ?? "Не удалось создать матч");
      setSubmitting(false);
      return;
    }
    setMessage(`Матч создан: ${body.match?.id ?? ""}`);
    setSubmitting(false);
  };

  return (
    <article className="surface rounded-2xl p-6">
      <h2 className="text-lg font-bold text-zinc-100">Параметры матча</h2>
      <div className="mt-4 space-y-2">
        <select
          className="input-base"
          value={state.tournamentId}
          onChange={(e) => setState((p) => ({ ...p, tournamentId: e.target.value }))}
        >
          <option value="">Выберите турнир</option>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <input
            className="input-base"
            value={state.round}
            onChange={(e) => setState((p) => ({ ...p, round: e.target.value }))}
            placeholder="Round"
            inputMode="numeric"
          />
          <input
            className="input-base"
            value={state.orderInRound}
            onChange={(e) => setState((p) => ({ ...p, orderInRound: e.target.value }))}
            placeholder="Order in round"
            inputMode="numeric"
          />
        </div>

        <select
          className="input-base"
          value={state.bracketSegment}
          onChange={(e) => setState((p) => ({ ...p, bracketSegment: e.target.value }))}
        >
          <option value="UPPER">UPPER</option>
          <option value="LOWER">LOWER</option>
          <option value="FINAL">FINAL</option>
        </select>

        <input
          className="input-base"
          type="datetime-local"
          value={state.scheduledAt}
          onChange={(e) => setState((p) => ({ ...p, scheduledAt: e.target.value }))}
        />

        <button type="button" className="button-primary w-full" onClick={createMatch} disabled={submitting}>
          {submitting ? "Создание..." : "Создать матч"}
        </button>
        {message && <p className="text-sm text-[#14ffec]">{message}</p>}
      </div>
    </article>
  );
}

