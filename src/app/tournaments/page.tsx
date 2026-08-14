import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBrandLogos, pickBrandLogo } from "@/lib/brand";
import { getTournamentStatusLabel } from "@/lib/tournamentStatus";
import GameCoverPanel from "@/components/games/GameCoverPanel";
import LoginTournamentNotifications from "@/components/tournaments/LoginTournamentNotifications";
import PublicImage from "@/components/ui/PublicImage";
import Kicker from "@/components/ui/Kicker";
import CtaBox from "@/components/ui/CtaBox";
import Hint from "@/components/ui/Hint";
import Reveal from "@/components/motion/Reveal";
import SplitHeading from "@/components/motion/SplitHeading";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";
import { formatRubFromMinor } from "@/lib/money";
import { readSession } from "@/lib/auth";

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
  requiresVerifiedExperience: boolean;
  game: { name: string; slug: string };
  teamApplications: Array<{ id: string }>;
};

export default async function TournamentsPage() {
  let tournaments: TournamentCard[] = [];
  const [logos, session] = await Promise.all([getBrandLogos(), readSession()]);
  const tournamentsLogo = pickBrandLogo(logos, 3);
  try {
    tournaments = (await prisma.tournament.findMany({
      include: { game: true, teamApplications: { select: { id: true } } },
      orderBy: { startsAt: "asc" },
    })) as TournamentCard[];
  } catch {
    tournaments = [];
  }

  const now = new Date();
  const upcomingTournament =
    tournaments
      .filter((item) => item.startsAt >= now)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0] ?? tournaments[0] ?? null;

  const applyHref = upcomingTournament
    ? session
      ? `/tournaments/${upcomingTournament.id}/apply`
      : `/sign-in?next=${encodeURIComponent(`/tournaments/${upcomingTournament.id}/apply`)}`
    : "/sign-in";

  return (
    <div className="w-full">
      <LoginTournamentNotifications />
      <Reveal className="flex items-center gap-3">
        {tournamentsLogo && (
          <PublicImage src={tournamentsLogo.src} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
        )}
        <div>
          <Kicker index="01">Расписание</Kicker>
          <SplitHeading
            text="Турниры"
            level={1}
            className="mt-1 text-3xl font-black uppercase tracking-[0.12em] text-[#14ffec]"
          />
        </div>
      </Reveal>
      <Hint>
        Соперников подбираем по уровню игры: ранг каждого участника проверяет модерация, поэтому опытные игроки на
        дополнительных аккаунтах в турнир не попадут.
      </Hint>

      {upcomingTournament && (
        <Reveal delay={0.1}>
          <GameCoverPanel
            slug={upcomingTournament.game.slug}
            className="ll-media-zoom mt-6"
            contentClassName="relative p-6"
          >
            <span className="ll-beam ll-beam--a" aria-hidden />
            <span className="ll-beam ll-beam--b" aria-hidden />
            <Kicker>ближайший турнир</Kicker>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-[#14ffec]">
              {upcomingTournament.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-zinc-300">
              {upcomingTournament.description ?? "Описание появится ближе к старту."}
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.14em] text-zinc-400">
              {upcomingTournament.game.name} · {getTournamentStatusLabel(upcomingTournament.status)} ·{" "}
              {upcomingTournament.teamApplications.length}/{upcomingTournament.maxTeams} команд
              {upcomingTournament.entryFeeMinor > 0
                ? ` · взнос ${formatRubFromMinor(upcomingTournament.entryFeeMinor)}`
                : " · участие бесплатное"}
              {upcomingTournament.requiresVerifiedExperience ? " · нужен подтверждённый ранг" : ""}
            </p>
            <div className="mt-5 max-w-sm">
              <CtaBox
                primary={{ href: applyHref, label: "Подать заявку" }}
                secondary={{ href: `/tournaments/${upcomingTournament.id}`, label: "Смотреть сетку" }}
                hint="Заявку подаёт капитан и сразу вписывает состав команды."
              />
              <Link
                href={`/teammates?game=${encodeURIComponent(upcomingTournament.game.slug)}`}
                className="button-ghost mt-2 inline-flex text-xs uppercase tracking-[0.12em]"
              >
                Не хватает игроков — найти
              </Link>
            </div>
          </GameCoverPanel>
        </Reveal>
      )}

      <Reveal className="mt-8 flex items-end justify-between gap-4">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500">Все турниры</h3>
        <span className="ll-kicker text-zinc-600">{tournaments.length} в сезоне</span>
      </Reveal>
      <StaggerGroup className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" gap={0.06}>
        {tournaments.map((t) => {
          const open = t.status === "REGISTRATION_OPEN";
          const fill = t.maxTeams > 0 ? Math.min(100, Math.round((t.teamApplications.length / t.maxTeams) * 100)) : 0;
          return (
            <StaggerItem key={t.id} className="h-full">
              <GameCoverPanel
                slug={t.game.slug}
                className="ll-hover-lift ll-media-zoom group h-full"
                minHeightClassName="min-h-[190px]"
                contentClassName="flex h-full min-h-[190px] flex-col p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">{t.game.name}</p>
                  {open ? (
                    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[#14ffec]">
                      <span className="ll-dot-live" aria-hidden />
                      приём заявок
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-2 text-xl font-bold text-zinc-100">{t.title}</h2>
                <p className="mt-2 text-xs text-zinc-400">
                  {getTournamentStatusLabel(t.status)} · {t.teamApplications.length}/{t.maxTeams} команд
                </p>
                <div className="ll-meter mt-3">
                  <span style={{ width: `${fill}%` }} />
                </div>
                <Link
                  href={open ? `/tournaments/${t.id}/apply` : `/tournaments/${t.id}`}
                  className="button-primary mt-auto inline-flex w-fit items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-[0.12em]"
                >
                  {open ? "Подать заявку" : "Подробнее"}
                  <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                    →
                  </span>
                </Link>
              </GameCoverPanel>
            </StaggerItem>
          );
        })}
      </StaggerGroup>
    </div>
  );
}
