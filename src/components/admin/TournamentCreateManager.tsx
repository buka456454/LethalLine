"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateMaxParticipants,
  calculatePrizePoolFromEntryFees,
  distributePrizePool,
  isAllowedTeamSize,
} from "@/lib/tournament";
import { CORE_GAMES } from "@/lib/gameAssets";
import { TOURNAMENT_STATUS_OPTIONS } from "@/lib/tournamentStatus";

type GameItem = { id: string; name: string; slug: string };

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
    teamSize: "1",
    maxTeams: "16",
    eventDate: "",
    startTime: "12:00",
    endTime: "18:00",
    status: "REGISTRATION_OPEN",
    isPublished: true,
    entryFeeRub: "0",
    prizeMode: "ENTRY_FEES",
    sponsorPrizeText: "",
    rules: "",
    requiresVerifiedExperience: false,
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
      const body = (await response.json()) as { games?: GameItem[] };
      setGames(body.games ?? []);
    };
    void loadGames();
  }, []);

  const sortedGames = useMemo(() => {
    const order = new Map(CORE_GAMES.map((g, i) => [g.slug, i]));
    return [...games].sort((a, b) => {
      const ia = order.has(a.slug) ? order.get(a.slug)! : 999;
      const ib = order.has(b.slug) ? order.get(b.slug)! : 999;
      if (ia !== ib) return ia - ib;
      return a.name.localeCompare(b.name);
    });
  }, [games]);

  const teamSizeNumber = useMemo(() => Number(state.teamSize), [state.teamSize]);
  const maxTeamsNumber = useMemo(() => Number(state.maxTeams), [state.maxTeams]);
  const computedMaxParticipants = useMemo(
    () => calculateMaxParticipants(maxTeamsNumber, teamSizeNumber),
    [maxTeamsNumber, teamSizeNumber],
  );

  const entryFeeMinor = useMemo(() => {
    const raw = state.entryFeeRub.trim().replace(",", ".");
    const rub = raw ? Number(raw) : 0;
    return Math.round((Number.isFinite(rub) ? rub : 0) * 100);
  }, [state.entryFeeRub]);

  const autoPrizePoolMinor = useMemo(() => {
    if (state.prizeMode !== "ENTRY_FEES") return 0;
    return calculatePrizePoolFromEntryFees(maxTeamsNumber, entryFeeMinor);
  }, [state.prizeMode, maxTeamsNumber, entryFeeMinor]);

  const prizeParts = useMemo(() => {
    return distributePrizePool(autoPrizePoolMinor);
  }, [autoPrizePoolMinor]);

  const buildDateTime = (date: string, time: string) => {
    if (!date) return null;
    const iso = `${date}T${time}:00`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const createTournament = async () => {
    setMessage("");
    const title = state.title.trim();
    const slug = (state.slug.trim() || toSlug(title)).toLowerCase();
    if (title.length < 4) return setMessage("Название турнира должно быть минимум 4 символа");
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) return setMessage("Slug турнира должен содержать только a-z, 0-9 и дефис");
    if (!state.gameId) return setMessage("Выберите игру");
    if (!isAllowedTeamSize(teamSizeNumber)) return setMessage("Формат команды должен быть: 1, 2 или 5");
    if (!Number.isInteger(maxTeamsNumber) || maxTeamsNumber < 2 || maxTeamsNumber > 512) {
      return setMessage("Количество команд должно быть от 2 до 512");
    }
    if (entryFeeMinor < 0) return setMessage("Взнос за участие должен быть числом >= 0");
    if (!state.eventDate) return setMessage("Укажите дату турнира");

    const startsAtValue = buildDateTime(state.eventDate, state.startTime);
    const endsAtValue = buildDateTime(state.eventDate, state.endTime);
    if (!startsAtValue) return setMessage("Некорректное время начала");
    if (!endsAtValue) return setMessage("Некорректное время окончания");
    if (endsAtValue <= startsAtValue) return setMessage("Время окончания должно быть позже времени начала");
    if (state.prizeMode === "SPONSOR" && !state.sponsorPrizeText.trim()) {
      return setMessage("Для спонсорского приза заполните описание");
    }

    const generatedRules = [
      state.rules.trim(),
      `Размер команды: ${teamSizeNumber}`,
      `Команд: ${maxTeamsNumber}`,
      `Участников: ${computedMaxParticipants}`,
      state.prizeMode === "ENTRY_FEES"
        ? `Призовой фонд от взносов: ${autoPrizePoolMinor / 100} RUB (85%), распределение 50/30/20`
        : `Спонсорский приз: ${state.sponsorPrizeText.trim()}`,
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
        description: state.description.trim() || `${title} — официальный турнир`,
        format: state.format,
        status: state.status,
        isPublished: state.isPublished,
        teamSize: teamSizeNumber,
        maxTeams: maxTeamsNumber,
        entryFeeMinor,
        eventDate: new Date(`${state.eventDate}T00:00:00`).toISOString(),
        startsAt: startsAtValue.toISOString(),
        endsAt: endsAtValue.toISOString(),
        prizeMode: state.prizeMode,
        sponsorPrizeText: state.prizeMode === "SPONSOR" ? state.sponsorPrizeText.trim() : undefined,
        rules: generatedRules || undefined,
        gameId: state.gameId,
        requiresVerifiedExperience: state.requiresVerifiedExperience,
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
      sponsorPrizeText: "",
      rules: "",
      entryFeeRub: "0",
      eventDate: "",
    }));
  };

  return (
    <article className="surface rounded-2xl p-6">
      <h2 className="text-lg font-bold text-zinc-100">Конструктор нового турнира</h2>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Название турнира</span>
          <input className="input-base" value={state.title} onChange={(e) => setState((p) => ({ ...p, title: e.target.value }))} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Slug (ссылка)</span>
          <input
            className="input-base"
            value={state.slug}
            onChange={(e) => setState((p) => ({ ...p, slug: e.target.value }))}
            onBlur={() => setState((p) => ({ ...p, slug: p.slug.trim() || toSlug(p.title) }))}
            placeholder="Автозаполнение, если оставить пустым"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Описание</span>
          <textarea
            className="input-base min-h-20"
            value={state.description}
            onChange={(e) => setState((p) => ({ ...p, description: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Игра</span>
          <select className="input-base" value={state.gameId} onChange={(e) => setState((p) => ({ ...p, gameId: e.target.value }))}>
            <option value="">Выберите игру</option>
            {sortedGames.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Формат сетки</span>
            <select className="input-base" value={state.format} onChange={(e) => setState((p) => ({ ...p, format: e.target.value }))}>
              <option value="SINGLE_ELIMINATION">Single Elimination</option>
              <option value="DOUBLE_ELIMINATION">Double Elimination</option>
              <option value="ROUND_ROBIN">Round Robin</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Формат команды</span>
            <select className="input-base" value={state.teamSize} onChange={(e) => setState((p) => ({ ...p, teamSize: e.target.value }))}>
              <option value="1">Соло (1 игрок)</option>
              <option value="2">Дуо (2 игрока)</option>
              <option value="5">Пати (5 игроков)</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Количество команд</span>
            <input
              className="input-base"
              value={state.maxTeams}
              onChange={(e) => setState((p) => ({ ...p, maxTeams: e.target.value }))}
              inputMode="numeric"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Итого участников (авто)</span>
            <input className="input-base" value={String(computedMaxParticipants)} readOnly />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Дата турнира</span>
            <input className="input-base" type="date" value={state.eventDate} onChange={(e) => setState((p) => ({ ...p, eventDate: e.target.value }))} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Начало</span>
            <input className="input-base" type="time" value={state.startTime} onChange={(e) => setState((p) => ({ ...p, startTime: e.target.value }))} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Окончание</span>
            <input className="input-base" type="time" value={state.endTime} onChange={(e) => setState((p) => ({ ...p, endTime: e.target.value }))} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Статус</span>
            <select className="input-base" value={state.status} onChange={(e) => setState((p) => ({ ...p, status: e.target.value }))}>
              {TOURNAMENT_STATUS_OPTIONS.map((statusOption) => (
                <option key={statusOption.value} value={statusOption.value}>
                  {statusOption.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 rounded border border-[#323232] bg-[#212121] px-3 text-sm text-zinc-300">
            <input type="checkbox" checked={state.isPublished} onChange={(e) => setState((p) => ({ ...p, isPublished: e.target.checked }))} />
            Опубликовать сразу
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Режим призов</span>
            <select className="input-base" value={state.prizeMode} onChange={(e) => setState((p) => ({ ...p, prizeMode: e.target.value }))}>
              <option value="ENTRY_FEES">От взносов</option>
              <option value="SPONSOR">Спонсорский приз</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Взнос за команду (RUB)</span>
            <input
              className="input-base"
              value={state.entryFeeRub}
              onChange={(e) => setState((p) => ({ ...p, entryFeeRub: e.target.value }))}
              inputMode="decimal"
            />
          </label>
        </div>

        {state.prizeMode === "SPONSOR" ? (
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Описание спонсорского приза</span>
            <textarea
              className="input-base min-h-20"
              value={state.sponsorPrizeText}
              onChange={(e) => setState((p) => ({ ...p, sponsorPrizeText: e.target.value }))}
              placeholder="Например: 3 игровых кресла + 5 VIP-билетов"
            />
          </label>
        ) : (
          <div className="rounded-lg border border-[#323232] bg-[#212121] p-3 text-sm text-zinc-300">
            <p>Призовой фонд от взносов (авто): {(autoPrizePoolMinor / 100).toFixed(2)} RUB (85%, 15% организатору)</p>
            <p className="mt-1">1 место: {(prizeParts.first / 100).toFixed(2)} RUB (50%)</p>
            <p>2 место: {(prizeParts.second / 100).toFixed(2)} RUB (30%)</p>
            <p>3 место: {(prizeParts.third / 100).toFixed(2)} RUB (20%)</p>
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Правила турнира</span>
          <textarea className="input-base min-h-28" value={state.rules} onChange={(e) => setState((p) => ({ ...p, rules: e.target.value }))} />
        </label>
        <label className="flex items-center gap-2 rounded border border-[#323232] bg-[#212121] px-3 py-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={state.requiresVerifiedExperience}
            onChange={(e) => setState((p) => ({ ...p, requiresVerifiedExperience: e.target.checked }))}
          />
          Для участия требуется подтвержденный опыт в выбранной игре
        </label>

        <button type="button" className="button-primary w-full" onClick={createTournament} disabled={submitting}>
          {submitting ? "Создание..." : "Создать турнир"}
        </button>
        {message && <p className="text-sm text-[#14ffec]">{message}</p>}
      </div>
    </article>
  );
}

