import Link from "next/link";
import Kicker from "@/components/ui/Kicker";
import GameCoverPanel from "@/components/games/GameCoverPanel";
import Reveal from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";
import { getTournamentStatusLabel } from "@/lib/tournamentStatus";

export type HomeCupCard = {
  id: string;
  title: string;
  status: string;
  maxTeams: number;
  teamSize: number;
  game: { name: string; slug: string };
  teamApplications: Array<{ id: string }>;
};

export default function HomeCupStrip({ cups }: { cups: HomeCupCard[] }) {
  if (cups.length === 0) return null;
  return (
    <section className="space-y-4">
      <Reveal className="flex items-end justify-between gap-4">
        <Kicker index="04">Турниры</Kicker>
        <Link href="/tournaments" className="ll-kicker ll-underline hover:text-[#14ffec]">
          все турниры ↗
        </Link>
      </Reveal>

      <StaggerGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" gap={0.07}>
        {cups.map((cup) => {
          const open = cup.status === "REGISTRATION_OPEN";
          const taken = cup.teamApplications.length;
          const fill = cup.maxTeams > 0 ? Math.min(100, Math.round((taken / cup.maxTeams) * 100)) : 0;
          return (
            <StaggerItem key={cup.id} className="h-full">
              <GameCoverPanel
                slug={cup.game.slug}
                className="ll-hover-lift ll-media-zoom group h-full"
                minHeightClassName="min-h-[190px]"
                contentClassName="flex h-full min-h-[190px] flex-col p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">{cup.game.name}</p>
                  {open ? (
                    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[#14ffec]">
                      <span className="ll-dot-live" aria-hidden />
                      приём заявок
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 text-lg font-bold text-zinc-100">{cup.title}</h3>
                <p className="mt-2 text-xs text-zinc-400">
                  {getTournamentStatusLabel(cup.status)} · {taken}/{cup.maxTeams} команд
                </p>
                <div className="ll-meter mt-3">
                  <span style={{ width: `${fill}%` }} />
                </div>
                <Link
                  href={open ? `/tournaments/${cup.id}/apply` : `/tournaments/${cup.id}`}
                  className="button-primary mt-auto inline-flex w-fit items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-[0.12em]"
                >
                  {open ? "Заявить состав" : "К сетке"}
                  <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                    →
                  </span>
                </Link>
              </GameCoverPanel>
            </StaggerItem>
          );
        })}
      </StaggerGroup>
    </section>
  );
}
