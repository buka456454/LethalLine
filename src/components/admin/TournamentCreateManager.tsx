"use client";

import { useEffect, useMemo, useState } from "react";

type GameItem = { id: string; name: string };

export default function TournamentCreateManager() {
  const [games, setGames] = useState<GameItem[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState({
    title: "",
    slug: "",
    gameId: "",
    description: "",
    format: "SINGLE_ELIMINATION",
    participationType: "TEAM",
    maxParticipants: "16",
    maxTeams: "16",
    startsAt: "",
    endsAt: "",
    status: "REGISTRATION_OPEN",
    isPublished: true,
    entryFeeRub: "0",
    prizePool: "",
    winnerReward: "",
    rules: "",
  });

  const toSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  useEffect(() => {
    const loadGames = async () => {
      const response = await fetch("/api/games");
      const body = (await response.json()) as { games?: Array<{ id: string; name: string }> };
      setGames(body.games ?? []);
    };
    void loadGames();
  }, []);

  const computedMaxParticipants = useMemo(() => {
    return Number(state.participationType === "TEAM" ? state.maxTeams : state.maxParticipants);
  }, [state.participationType, state.maxParticipants, state.maxTeams]);

  const entryFeeMinor = useMemo(() => {
    const raw = state.entryFeeRub.trim().replace(",", ".");
    const rub = raw ? Number(raw) : 0;
    return Math.round((Number.isFinite(rub) ? rub : 0) * 100);
  }, [state.entryFeeRub]);

  const createTournament = async () => {
    setMessage("");
    const title = state.title.trim();
    const slug = (state.slug.trim() || toSlug(title)).toLowerCase();
    if (title.length < 4) return setMessage("Название турнира должно быть минимум 4 символа");
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) return setMessage("Slug турнира должен содержать только a-z, 0-9 и дефис");
    if (!state.gameId) return setMessage("Выбери игру для турнира");
    if (!Number.isInteger(computedMaxParticipants) || computedMaxParticipants < 2 || computedMaxParticipants > 512) {
      return setMessage("Максимум участников/команд должен быть от 2 до 512");
    }
    if (entryFeeMinor < 0) return setMessage("Взнос за участие должен быть числом >= 0");

    const startsAtValue = state.startsAt ? new Date(state.startsAt) : new Date(Date.now() + 1000 * 60 * 60 * 24);
    const endsAtValue = state.endsAt ? new Date(state.endsAt) : null;
    if (Number.isNaN(startsAtValue.getTime())) return setMessage("Укажи корректную дату старта");
    if (endsAtValue && Number.isNaN(endsAtValue.getTime())) return setMessage("Укажи корректную дату окончания");
    if (endsAtValue && endsAtValue <= startsAtValue) return setMessage("Дата окончания должна быть позже даты старта");

    const generatedRules = [
      state.rules.trim(),
      `Тип участия: ${state.participationType === "TEAM" ? "Команды" : "Одиночные игроки"}`,
      state.prizePool.trim() ? `Призовой фонд: ${state.prizePool.trim()}` : "",
      state.winnerReward.trim() ? `Награда победителю: ${state.winnerReward.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    setSubmitting(true);
    const response = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        description: state.description.trim() || `${title} official bracket`,
        format: state.format,
        status: state.status,
        isPublished: state.isPublished,
        maxParticipants: computedMaxParticipants,
        entryFeeMinor,
        startsAt: startsAtValue.toISOString(),
        endsAt: endsAtValue ? endsAtValue.toISOString() : undefined,
        rules: generatedRules || undefined,
        gameId: state.gameId,
      }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "Ошибка создания турнира");
      setSubmitting(false);
      return;
    }
    setMessage("Турнир создан");
    setSubmitting(false);
    setState((prev) => ({
      ...prev,
      title: "",
      slug: "",
      description: "",
      prizePool: "",
      winnerReward: "",
      rules: "",
      endsAt: "",
      entryFeeRub: "0",
    }));
  };

  return (
    <article className="surface rounded-2xl p-6">
      <h2 className="text-lg font-bold text-zinc-100">Параметры турнира</h2>
      <div className="mt-4 space-y-2">
        <input
          className="input-base"
          value={state.title}
          onChange={(e) => setState((p) => ({ ...p, title: e.target.value }))}
          placeholder="Spring Clash 2026"
        />
        <input
          className="input-base"
          value={state.slug}
          onChange={(e) => setState((p) => ({ ...p, slug: e.target.value }))}
          onBlur={() => setState((p) => ({ ...p, slug: p.slug.trim() || toSlug(p.title) }))}
          placeholder="spring-clash-2026"
        />
        <textarea
          className="input-base min-h-20"
          value={state.description}
          onChange={(e) => setState((p) => ({ ...p, description: e.target.value }))}
          placeholder="Короткое описание турнира"
        />
        <select className="input-base" value={state.gameId} onChange={(e) => setState((p) => ({ ...p, gameId: e.target.value }))}>
          <option value="">Выберите игру</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select className="input-base" value={state.format} onChange={(e) => setState((p) => ({ ...p, format: e.target.value }))}>
            <option value="SINGLE_ELIMINATION">Single Elimination</option>
            <option value="DOUBLE_ELIMINATION">Double Elimination</option>
            <option value="ROUND_ROBIN">Round Robin</option>
          </select>
          <select
            className="input-base"
            value={state.participationType}
            onChange={(e) => setState((p) => ({ ...p, participationType: e.target.value }))}
          >
            <option value="TEAM">Командный</option>
            <option value="SOLO">Одиночный</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            className="input-base"
            value={state.maxTeams}
            onChange={(e) => setState((p) => ({ ...p, maxTeams: e.target.value }))}
            placeholder="Макс. команд (например 16)"
            inputMode="numeric"
          />
          <input
            className="input-base"
            value={state.maxParticipants}
            onChange={(e) => setState((p) => ({ ...p, maxParticipants: e.target.value }))}
            placeholder="Макс. игроков (например 64)"
            inputMode="numeric"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            className="input-base"
            type="datetime-local"
            value={state.startsAt}
            onChange={(e) => setState((p) => ({ ...p, startsAt: e.target.value }))}
          />
          <input
            className="input-base"
            type="datetime-local"
            value={state.endsAt}
            onChange={(e) => setState((p) => ({ ...p, endsAt: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select className="input-base" value={state.status} onChange={(e) => setState((p) => ({ ...p, status: e.target.value }))}>
            <option value="DRAFT">DRAFT</option>
            <option value="REGISTRATION_OPEN">REGISTRATION_OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
          <label className="flex items-center gap-2 rounded border border-[#323232] bg-[#212121] px-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={state.isPublished}
              onChange={(e) => setState((p) => ({ ...p, isPublished: e.target.checked }))}
            />
            Опубликовать сразу
          </label>
        </div>

        <input
          className="input-base"
          value={state.entryFeeRub}
          onChange={(e) => setState((p) => ({ ...p, entryFeeRub: e.target.value }))}
          placeholder="Взнос за участие (RUB, 0 = бесплатно)"
          inputMode="decimal"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            className="input-base"
            value={state.prizePool}
            onChange={(e) => setState((p) => ({ ...p, prizePool: e.target.value }))}
            placeholder="Призовой фонд (например 100 000 RUB)"
          />
          <input
            className="input-base"
            value={state.winnerReward}
            onChange={(e) => setState((p) => ({ ...p, winnerReward: e.target.value }))}
            placeholder="Награда победителю"
          />
        </div>

        <textarea
          className="input-base min-h-28"
          value={state.rules}
          onChange={(e) => setState((p) => ({ ...p, rules: e.target.value }))}
          placeholder="Правила турнира (карты, bo3/bo5, штрафы и т.д.)"
        />

        <button type="button" className="button-primary w-full" onClick={createTournament} disabled={submitting}>
          {submitting ? "Создание..." : "Создать турнир"}
        </button>
        {message && <p className="text-sm text-[#14ffec]">{message}</p>}
      </div>
    </article>
  );
}

