import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getBrandLogos, pickBrandLogo } from "@/lib/brand";
import LoginTournamentNotifications from "@/components/tournaments/LoginTournamentNotifications";
import SaiIcon from "@/components/ui/SaiIcon";

export const dynamic = "force-dynamic";

type TournamentCard = {
  id: string;
  title: string;
  description: string | null;
  format: string;
  status: string;
  maxParticipants: number;
  startsAt: Date;
  game: { name: string };
  registrations: Array<{ id: string }>;
};

export default async function TournamentsPage() {
  let tournaments: TournamentCard[] = [];
  const logos = await getBrandLogos();
  const tournamentsLogo = pickBrandLogo(logos, 3);
  try {
    tournaments = await prisma.tournament.findMany({
      include: { game: true, registrations: true },
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
          <Image src={tournamentsLogo.src} alt="Tournaments logo" width={36} height={36} className="h-9 w-9 object-contain" />
        )}
        <SaiIcon name="calendar" size={20} />
        <h1 className="text-3xl font-black uppercase tracking-[0.14em] text-[#14ffec]">Турниры</h1>
      </div>
      <p className="mt-2 text-zinc-400">Участвуйте в матчах и следите за прогрессом сетки в реальном времени.</p>

      {upcomingTournament && (
        <section className="relative mt-6 overflow-hidden rounded-2xl border border-[#323232] bg-gradient-to-br from-[#212121] via-[#212121] to-[#323232] p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#0d7377]/20 blur-2xl" />
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Ближайший турнир</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-[#14ffec]">{upcomingTournament.title}</h2>
          <p className="mt-3 max-w-3xl text-sm text-zinc-300">
            {upcomingTournament.description ?? "Описание скоро появится. Следите за обновлениями турнирной страницы."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded bg-[#323232] px-2 py-1 text-zinc-300">
              <SaiIcon name="star" />
              {upcomingTournament.game.name}
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-[#323232] px-2 py-1 text-zinc-300">
              <SaiIcon name="home" />
              {upcomingTournament.format}
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-[#323232] px-2 py-1 text-zinc-300">
              <SaiIcon name="check" />
              {upcomingTournament.status}
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-[#323232] px-2 py-1 text-zinc-300">
              <SaiIcon name="calendar" />
              {new Date(upcomingTournament.startsAt).toLocaleString("ru-RU")}
            </span>
          </div>

          <div className="mt-4 max-w-md">
            <p className="mb-1 text-xs text-zinc-500">
              Участники: {upcomingTournament.registrations.length}/{upcomingTournament.maxParticipants}
            </p>
            <div className="h-2 overflow-hidden rounded bg-[#323232]">
              <div
                className="h-full bg-gradient-to-r from-[#0d7377] to-[#14ffec]"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((upcomingTournament.registrations.length / upcomingTournament.maxParticipants) * 100),
                  )}%`,
                }}
              />
            </div>
          </div>

          <Link href={`/tournaments/${upcomingTournament.id}`} className="button-primary mt-5 inline-block">
            Открыть грядущий турнир
          </Link>
        </section>
      )}

      <h3 className="mt-7 text-xl font-black uppercase tracking-[0.12em] text-[#14ffec]">Все турниры</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tournaments.map((t) => (
          <article key={t.id} className="surface rounded-xl p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{t.game.name}</p>
            <h2 className="mt-2 text-xl font-bold">{t.title}</h2>
            <p className="mt-1 text-xs text-zinc-500">{new Date(t.startsAt).toLocaleString("ru-RU")}</p>
            <p className="mt-2 text-sm text-zinc-400">
              {t.registrations.length}/{t.maxParticipants} участников
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="rounded bg-[#323232] px-2 py-1 text-xs text-[#14ffec]">{t.format}</span>
              <Link href={`/tournaments/${t.id}`} className="text-sm text-[#14ffec]">
                Детали
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
