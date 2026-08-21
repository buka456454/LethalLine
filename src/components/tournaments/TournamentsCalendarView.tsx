"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GameCoverImageStack from "@/components/games/GameCoverImageStack";
import { getGameCoverDecor } from "@/lib/gameAssets";
import {
  formatEntryFeeLabel,
  formatTeamSizeLabel,
  formatTournamentDayKey,
  type TournamentCatalogItem,
} from "@/lib/tournamentDisplay";

const EASE = [0.22, 1, 0.36, 1] as const;
const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] as const;

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function buildMonthCells(month: Date) {
  const first = startOfMonth(month);
  // Monday-first index: Sun=0 -> 6, Mon=1 -> 0, ...
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: Array<{ date: Date | null; key: string }> = [];

  for (let i = 0; i < offset; i += 1) {
    cells.push({ date: null, key: `pad-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    cells.push({ date, key: formatTournamentDayKey(date) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, key: `tail-${cells.length}` });
  }
  return cells;
}

export default function TournamentsCalendarView({
  tournaments,
}: {
  tournaments: TournamentCatalogItem[];
}) {
  const initialMonth = useMemo(() => {
    const upcoming = tournaments
      .map((t) => new Date(t.startsAt))
      .filter((d) => !Number.isNaN(d.getTime()) && d >= new Date())
      .sort((a, b) => a.getTime() - b.getTime())[0];
    return startOfMonth(upcoming ?? new Date());
  }, [tournaments]);

  const [month, setMonth] = useState(initialMonth);

  const byDay = useMemo(() => {
    const map = new Map<string, TournamentCatalogItem[]>();
    for (const t of tournaments) {
      const key = formatTournamentDayKey(t.startsAt);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }
    return map;
  }, [tournaments]);

  const cells = useMemo(() => buildMonthCells(month), [month]);
  const todayKey = formatTournamentDayKey(new Date());
  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3 border border-[var(--ll-line)] bg-[var(--surface)] px-3 py-2">
        <button
          type="button"
          className="button-ghost px-2 py-1 text-[10px] uppercase tracking-[0.14em]"
          onClick={() => setMonth((prev) => addMonths(prev, -1))}
          aria-label="Предыдущий месяц"
        >
          ←
        </button>
        <AnimatePresence mode="wait">
          <motion.p
            key={monthKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="text-xs font-black uppercase tracking-[0.16em] text-[#14ffec]"
          >
            {monthLabel(month)}
          </motion.p>
        </AnimatePresence>
        <button
          type="button"
          className="button-ghost px-2 py-1 text-[10px] uppercase tracking-[0.14em]"
          onClick={() => setMonth((prev) => addMonths(prev, 1))}
          aria-label="Следующий месяц"
        >
          →
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-1 py-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500"
          >
            {day}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={monthKey}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="grid grid-cols-7 gap-1"
        >
          {cells.map((cell) => {
            if (!cell.date) {
              return <div key={cell.key} className="min-h-[88px] rounded-sm border border-transparent" />;
            }
            const events = byDay.get(cell.key) ?? [];
            const isToday = cell.key === todayKey;
            const hasEvents = events.length > 0;
            const coverSlug = events[0]?.game.slug;
            const decor = coverSlug ? getGameCoverDecor(coverSlug) : null;

            return (
              <div
                key={cell.key}
                className={[
                  "relative min-h-[88px] overflow-hidden rounded-sm border p-1.5 transition-[border-color,box-shadow] duration-300",
                  hasEvents
                    ? `${decor?.panelBgClass ?? "bg-[#1a1a1a]"} border-[var(--ll-line)] hover:border-[#14ffec]/55 hover:shadow-[0_0_18px_-10px_rgba(20,255,236,0.7)]`
                    : "border-zinc-800/80 bg-[#171717]/80 text-zinc-600",
                  isToday ? "ring-1 ring-[#14ffec]/35" : "",
                ].join(" ")}
              >
                {hasEvents && coverSlug ? (
                  <GameCoverImageStack
                    slug={coverSlug}
                    alt=""
                    className="pointer-events-none absolute inset-0 z-0"
                    sizes="(max-width: 768px) 14vw, 120px"
                  />
                ) : null}
                {hasEvents ? (
                  <div
                    className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/90 via-black/55 to-black/25"
                    aria-hidden
                  />
                ) : null}

                <div className="relative z-10 flex items-center justify-between gap-1">
                  <span
                    className={[
                      "font-mono text-[10px] uppercase tracking-[0.12em]",
                      isToday ? "text-[#14ffec]" : hasEvents ? "text-zinc-100" : "text-zinc-600",
                    ].join(" ")}
                  >
                    {cell.date.getDate()}
                  </span>
                  {hasEvents ? (
                    <span className="flex gap-0.5" aria-hidden>
                      {events.slice(0, 3).map((event) => (
                        <span key={event.id} className="h-1 w-1 rounded-full bg-[#14ffec]" />
                      ))}
                    </span>
                  ) : null}
                </div>

                {hasEvents ? (
                  <ul className="relative z-10 mt-1.5 space-y-1">
                    {events.slice(0, 2).map((event) => (
                      <li key={event.id}>
                        <Link
                          href={`/tournaments/${event.id}`}
                          className="block truncate text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-100 transition-colors duration-200 hover:text-[#14ffec]"
                          title={`${event.title} · ${event.game.name} · ${formatTeamSizeLabel(event.teamSize)} · ${formatEntryFeeLabel(event.entryFeeMinor)}`}
                        >
                          {event.title}
                        </Link>
                      </li>
                    ))}
                    {events.length > 2 ? (
                      <li className="text-[9px] uppercase tracking-[0.12em] text-zinc-400">
                        +{events.length - 2} ещё
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
