import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBrandLogos, pickBrandLogo } from "@/lib/brand";
import { getTournamentStatusLabel } from "@/lib/tournamentStatus";
import GameCoverPanel from "@/components/games/GameCoverPanel";
import LoginTournamentNotifications from "@/components/tournaments/LoginTournamentNotifications";
import SaiIcon from "@/components/ui/SaiIcon";
import PublicImage from "@/components/ui/PublicImage";

export const dynamic = "force-dynamic";

type TournamentCard = {
  id: string;
  title: string;
  description: string | null;
  format: string;
  status: string;
  teamSize: number;
  maxTeams: number;
  maxParticipants: number;
  entryFeeMinor: number;
  prizeMode: "ENTRY_FEES" | "SPONSOR";
  sponsorPrizeText: string | null;
  startsAt: Date;
  game: { name: string; slug: string };
  registrations: Array<{ id: string }>;
  teamApplications: Array<{ id: string }>;
};

export default async function TournamentsPage() {
  let tournaments: TournamentCard[] = [];
  const logos = await getBrandLogos();
  const tournamentsLogo = pickBrandLogo(logos, 3);
  try {
    tournaments = await prisma.tournament.findMany({
      include: { game: true, registrations: true, teamApplications: true },
      orderBy: { startsAt: "asc" },
    }) as TournamentCard[];
  } catch {
    tournaments = [];
  }

  const now = new Date();
  const upcomingTournament =
    tournaments
      .filter((item) => item.startsAt >= now)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0] ?? tournaments[0] ?? null;

  return (
    <div className="w-full">
      <LoginTournamentNotifications />
      <div className="flex items-center gap-3">
        {tournamentsLogo && (
          <PublicImage src={tournamentsLogo.src} alt="Tournaments logo" width={36} height={36} className="h-9 w-9 object-contain" />
        )}
        <SaiIcon name="calendar" size={20} />
        <h1 className="text-3xl font-black uppercase tracking-[0.14em] text-[#14ffec]">Турниры</h1>
      </div>
      <p className="mt-2 text-zinc-400">Участвуйте в матчах и следите за прогрессом сетки в реальном времени.</p>

      {upcomingTournament && (
        <GameCoverPanel
          slug={upcomingTournament.game.slug}
          className="mt-6 rounded-2xl"
          contentClassName="p-6"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 z-[1] h-36 w-36 rounded-full bg-[#0d7377]/20 blur-2xl" />
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">Ближайший турнир</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-[#14ffec]">{upcomingTournament.title}</h2>
          <p className="mt-3 max-w-3xl text-sm text-zinc-200">
            {upcomingTournament.description ?? "Описание скоро появится. Следите за обновлениями турнирной страницы."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded bg-black/45 px-2 py-1 text-zinc-200 backdrop-blur-sm">
              <SaiIcon name="star" />
              {upcomingTournament.game.name}
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-black/45 px-2 py-1 text-zinc-200 backdrop-blur-sm">
              <SaiIcon name="home" />
              {upcomingTournament.format}
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-black/45 px-2 py-1 text-zinc-200 backdrop-blur-sm">
              <SaiIcon name="check" />
              {getTournamentStatusLabel(upcomingTournament.status)}
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-black/45 px-2 py-1 text-zinc-200 backdrop-blur-sm">
              <SaiIcon name="calendar" />
              {new Date(upcomingTournament.startsAt).toLocaleString("ru-RU")}
            </span>
          </div>

          <div className="mt-4 max-w-md">
            <p className="mb-1 text-xs text-zinc-300">
              Команды: {upcomingTournament.teamApplications.length}/{upcomingTournament.maxTeams} | Участники:{" "}
              {upcomingTournament.teamApplications.length * upcomingTournament.teamSize}/{upcomingTournament.maxParticipants}
            </p>
            <div className="h-2 overflow-hidden rounded bg-black/40">
              <div
                className="h-full bg-gradient-to-r from-[#0d7377] to-[#14ffec]"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((upcomingTournament.teamApplications.length / upcomingTournament.maxTeams) * 100),
                  )}%`,
                }}
              />
            </div>
          </div>

          <Link href={`/tournaments/${upcomingTournament.id}`} className="button-primary relative z-[2] mt-5 inline-block">
            Открыть грядущий турнир
          </Link>
        </GameCoverPanel>
      )}

      <h3 className="mt-7 text-xl font-black uppercase tracking-[0.12em] text-[#14ffec]">Все турниры</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tournaments.map((t) => (
          <GameCoverPanel key={t.id} slug={t.game.slug} minHeightClassName="min-h-[180px]" contentClassName="flex h-full min-h-[180px] flex-col p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-300">{t.game.name}</p>
            <h2 className="mt-2 text-xl font-bold text-zinc-100">{t.title}</h2>
            <p className="mt-1 text-xs text-zinc-300">{new Date(t.startsAt).toLocaleString("ru-RU")}</p>
            <p className="mt-2 text-sm text-zinc-200">
              {t.teamApplications.length}/{t.maxTeams} команд ({t.teamApplications.length * t.teamSize}/{t.maxParticipants} участников)
            </p>
            <div className="mt-auto flex items-center justify-between pt-4">
              <span className="rounded bg-black/45 px-2 py-1 text-xs text-[#14ffec] backdrop-blur-sm">{t.format}</span>
              <Link href={`/tournaments/${t.id}`} className="text-sm text-[#14ffec]">
                Детали
              </Link>
            </div>
          </GameCoverPanel>
        ))}
      </div>
    </div>
  );
}
