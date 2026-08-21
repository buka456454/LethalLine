"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { TournamentCatalogItem } from "@/lib/tournamentDisplay";
import TournamentsCalendarView from "@/components/tournaments/TournamentsCalendarView";
import TournamentsListView from "@/components/tournaments/TournamentsListView";

const EASE = [0.22, 1, 0.36, 1] as const;
const STORAGE_KEY = "ll-tournaments-view";

type ViewMode = "list" | "calendar";

function isViewMode(value: string | null): value is ViewMode {
  return value === "list" || value === "calendar";
}

export default function TournamentsCatalog({
  tournaments,
}: {
  tournaments: TournamentCatalogItem[];
}) {
  const [view, setView] = useState<ViewMode>("list");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isViewMode(stored)) setView(stored);
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, view);
    } catch {
      // ignore
    }
  }, [view, ready]);

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500">Все турниры</h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            {tournaments.length} в сезоне
          </p>
        </div>

        <div
          className="relative inline-flex gap-1 border border-[var(--ll-line)] bg-[#1a1a1a] p-1"
          role="tablist"
          aria-label="Вид списка турниров"
        >
          {(
            [
              { id: "list", label: "Список" },
              { id: "calendar", label: "Календарь" },
            ] as const
          ).map((option) => {
            const active = view === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={[
                  "relative px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-300",
                  active ? "text-[#151515]" : "text-zinc-400 hover:text-[#14ffec]",
                ].join(" ")}
                onClick={() => setView(option.id)}
              >
                {active ? (
                  <motion.span
                    layoutId="tournaments-view-pill"
                    className="absolute inset-0 bg-[#14ffec] shadow-[0_0_18px_-6px_rgba(20,255,236,0.7)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <span className="relative z-10">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, x: view === "calendar" ? 18 : -18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: view === "calendar" ? -18 : 18 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {view === "list" ? (
            <TournamentsListView tournaments={tournaments} />
          ) : (
            <TournamentsCalendarView tournaments={tournaments} />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
