import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBrandLogos, pickBrandLogo } from "@/lib/brand";
import { getTournamentStatusLabel } from "@/lib/tournamentStatus";
import GameCoverPanel from "@/components/games/GameCoverPanel";
import LoginTournamentNotifications from "@/components/tournaments/LoginTournamentNotifications";
import TournamentsCatalog from "@/components/tournaments/TournamentsCatalog";
import PublicImage from "@/components/ui/PublicImage";
import Kicker from "@/components/ui/Kicker";
import CtaBox from "@/components/ui/CtaBox";
import Hint from "@/components/ui/Hint";
import Reveal from "@/components/motion/Reveal";
import SplitHeading from "@/components/motion/SplitHeading";
import { formatRubFromMinor } from "@/lib/money";
import { readSession } from "@/lib/auth";
import { serializeTournamentCatalogItem } from "@/lib/tournamentDisplay";

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

  const catalogItems = tournaments.map(serializeTournamentCatalogItem);

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

      <Reveal delay={0.15}>
        <TournamentsCatalog tournaments={catalogItems} />
      </Reveal>
    </div>
  );
}
