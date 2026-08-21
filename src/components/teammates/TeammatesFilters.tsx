"use client";

import { useMemo } from "react";
import NumberStepper from "@/components/ui/NumberStepper";
import {
  filterRoleOptions,
  getExperienceScale,
  getGameQuestionnaireUi,
  type ExperienceMetric,
} from "@/lib/gameQuestionnaireConfig";
import { cn } from "@/lib/cn";

export type TeammateGameOption = { id: string; name: string; slug: string };

type Props = {
  games: TeammateGameOption[];
  loading: boolean;
  gameId: string;
  role: string;
  metric: ExperienceMetric;
  expFrom: number | null;
  expTo: number | null;
  onGameId: (gameId: string) => void;
  onRole: (role: string) => void;
  onMetric: (metric: ExperienceMetric) => void;
  onExpFrom: (value: number | null) => void;
  onExpTo: (value: number | null) => void;
  onApply: () => void;
  onReset: () => void;
  hasActiveFilters: boolean;
};

export default function TeammatesFilters({
  games,
  loading,
  gameId,
  role,
  metric,
  expFrom,
  expTo,
  onGameId,
  onRole,
  onMetric,
  onExpFrom,
  onExpTo,
  onApply,
  onReset,
  hasActiveFilters,
}: Props) {
  const selectedGame = games.find((game) => game.id === gameId) ?? null;
  const locked = !selectedGame;
  const ui = selectedGame ? getGameQuestionnaireUi(selectedGame.slug) : null;
  const roles = selectedGame ? filterRoleOptions(selectedGame.slug) : [];
  const scale = selectedGame ? getExperienceScale(selectedGame.slug, metric) : null;
  const ratingScale = selectedGame ? getExperienceScale(selectedGame.slug, "rating") : null;

  const lockHint = "Сначала выберите игру";

  const metricOptions = useMemo(() => {
    if (!ratingScale) return [];
    return [
      { id: "rating" as const, label: ratingScale.shortLabel },
      { id: "hours" as const, label: "Часы" },
    ];
  }, [ratingScale]);

  return (
    <section className="ll-frame ll-frame--brackets p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Игра</span>
          <select
            className="input-base"
            value={gameId}
            onChange={(event) => onGameId(event.target.value)}
          >
            <option value="">Все игры</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">
            {ui?.role.label ?? "Роль"}
          </span>
          <select
            className="input-base disabled:cursor-not-allowed disabled:opacity-45"
            value={role}
            disabled={locked}
            title={locked ? lockHint : undefined}
            onChange={(event) => onRole(event.target.value)}
          >
            <option value="">{locked ? lockHint : "Любая роль"}</option>
            {roles.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Исчисление опыта</span>
          <div
            className={cn(
              "relative inline-flex w-full gap-1 border border-[var(--ll-line)] bg-[#1a1a1a] p-1",
              locked && "opacity-45",
            )}
            role="tablist"
            aria-label="Исчисление опыта"
          >
            {metricOptions.length === 0 ? (
              <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                {lockHint}
              </span>
            ) : (
              metricOptions.map((option) => {
                const active = metric === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    disabled={locked}
                    className={cn(
                      "flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-300 disabled:cursor-not-allowed",
                      active ? "bg-[#14ffec] text-[#151515]" : "text-zinc-400 hover:text-[#14ffec]",
                    )}
                    onClick={() => onMetric(option.id)}
                  >
                    {option.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">
            {scale ? `${scale.label} · от` : "Опыт · от"}
          </span>
          <NumberStepper
            value={expFrom}
            onChange={onExpFrom}
            min={scale?.min ?? 0}
            max={scale?.max ?? 20_000}
            step={scale?.step ?? 50}
            disabled={locked}
            placeholder="от"
            ariaLabel="Опыт от"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">до</span>
          <NumberStepper
            value={expTo}
            onChange={onExpTo}
            min={scale?.min ?? 0}
            max={scale?.max ?? 20_000}
            step={scale?.step ?? 50}
            disabled={locked}
            placeholder="до"
            ariaLabel="Опыт до"
          />
        </label>
        <div className="flex items-end gap-2">
          <button type="button" className="button-primary w-full" onClick={onApply} disabled={loading}>
            Применить
          </button>
          <button
            type="button"
            className="button-secondary text-sm"
            onClick={onReset}
            disabled={loading || !hasActiveFilters}
          >
            Сброс
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Роль и опыт зависят от игры. Можно заполнить только «от» или только «до».
      </p>
    </section>
  );
}
