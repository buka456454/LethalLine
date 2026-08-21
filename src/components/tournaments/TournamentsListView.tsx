"use client";

import Link from "next/link";
import GameCoverPanel from "@/components/games/GameCoverPanel";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";
import { getTournamentStatusLabel } from "@/lib/tournamentStatus";
import {
  formatEntryFeeLabel,
  formatTeamSizeLabel,
  formatTournamentDate,
  type TournamentCatalogItem,
} from "@/lib/tournamentDisplay";

export default function TournamentsListView({
  tournaments,
}: {
  tournaments: TournamentCatalogItem[];
}) {
  if (tournaments.length === 0) {
    return (
      <p className="mt-4 text-sm uppercase tracking-[0.12em] text-zinc-500">
        Турниров пока нет.
      </p>
    );
  }

  return (
    <StaggerGroup className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" gap={0.06}>
      {tournaments.map((t) => {
        const open = t.status === "REGISTRATION_OPEN";
        const fill = t.maxTeams > 0 ? Math.min(100, Math.round((t.teamCount / t.maxTeams) * 100)) : 0;
        return (
          <StaggerItem key={t.id} className="h-full">
            <GameCoverPanel
              slug={t.game.slug}
              className="ll-hover-lift ll-media-zoom group relative h-full transition-[border-color,box-shadow] duration-300 hover:border-[#14ffec]/55"
              minHeightClassName="min-h-[210px]"
              contentClassName="flex h-full min-h-[210px] flex-col p-4"
            >
              <Link
                href={`/tournaments/${t.id}`}
                className="absolute inset-0 z-10 rounded-[0.85rem] outline-none focus-visible:ring-2 focus-visible:ring-[#14ffec]/50"
                aria-label={`${t.title} — смотреть сетку`}
              />
              <div className="relative z-0 flex h-full flex-col pointer-events-none">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">{t.game.name}</p>
                  {open ? (
                    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[#14ffec]">
                      <span className="ll-dot-live" aria-hidden />
                      приём заявок
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-2 text-xl font-bold text-zinc-100 transition-colors duration-300 group-hover:text-[#14ffec]">
                  {t.title}
                </h2>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                  <span>{formatTournamentDate(t.startsAt)}</span>
                  <span className="text-zinc-600">·</span>
                  <span>{formatTeamSizeLabel(t.teamSize)}</span>
                  <span className="text-zinc-600">·</span>
                  <span>{formatEntryFeeLabel(t.entryFeeMinor)}</span>
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  {getTournamentStatusLabel(t.status)} · {t.teamCount}/{t.maxTeams} команд
                </p>
                <div className="ll-meter mt-3">
                  <span style={{ width: `${fill}%` }} />
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#14ffec]">
                    Смотреть сетку
                    <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                      →
                    </span>
                  </span>
                </div>
              </div>
              {open ? (
                <Link
                  href={`/tournaments/${t.id}/apply`}
                  className="pointer-events-auto absolute bottom-3.5 right-3.5 z-20 inline-flex items-center rounded-sm border border-[#14ffec] bg-[#14ffec] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#151515] transition-[filter,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_0_14px_-4px_rgba(20,255,236,0.7)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  Заявка
                </Link>
              ) : null}
            </GameCoverPanel>
          </StaggerItem>
        );
      })}
    </StaggerGroup>
  );
}
