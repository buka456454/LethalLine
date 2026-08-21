import { RegistrationStatus, TournamentFormat } from "@prisma/client";
import Link from "next/link";
import TournamentBracket from "@/components/bracket/TournamentBracket";
import GameCoverPanel from "@/components/games/GameCoverPanel";
import TournamentAdminActions from "@/components/tournaments/TournamentAdminActions";
import TournamentPodium from "@/components/tournaments/TournamentPodium";
import { isOwnerAdminSession, readSession } from "@/lib/auth";
import { buildParticipantRosters } from "@/lib/participant-roster";
import { prisma } from "@/lib/prisma";
import { getApplicationStatusLabel, getTournamentStatusLabel } from "@/lib/tournamentStatus";
import { computeTournamentPodium } from "@/lib/tournamentPodium";
import { formatRubFromMinor } from "@/lib/money";
import CtaBox from "@/components/ui/CtaBox";
import Frame from "@/components/ui/Frame";
import Kicker from "@/components/ui/Kicker";
import Hint from "@/components/ui/Hint";
import Reveal from "@/components/motion/Reveal";
import SplitHeading from "@/components/motion/SplitHeading";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";

export const dynamic = "force-dynamic";

type TournamentDetails = {
  id: string;
  title: string;
  description: string | null;
  format: TournamentFormat;
  status: string;
  endsAt: Date | null;
  teamSize: number;
  maxTeams: number;
  maxParticipants: number;
  requiresVerifiedExperience: boolean;
  entryFeeMinor: number;
  prizeMode: "ENTRY_FEES" | "SPONSOR";
  sponsorPrizeText: string | null;
  game: { name: string; slug: string };
  registrations: Array<{ id: string; status: RegistrationStatus; userId: string; user: { username: string; avatarUrl: string | null } }>;
  teamApplications: Array<{
    id: string;
    teamName: string;
    teamLogoUrl: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    captainId: string;
    captain: { username: string; avatarUrl: string | null };
    members: Array<{ id: string; username: string; isCaptain: boolean; linkedUserId: string | null }>;
  }>;
  matches: Array<{
    id: string;
    round: number;
    orderInRound: number;
    bracketSegment: string;
    participantA: string | null;
    participantB: string | null;
    scoreA: number;
    scoreB: number;
    status: "SCHEDULED" | "LIVE" | "FINISHED";
    winnerLabel: string | null;
  }>;
};

export default async function TournamentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await readSession();
  const canEditBracket = session ? isOwnerAdminSession(session) : false;
  let tournament: TournamentDetails | null = null;

  try {
    tournament = (await prisma.tournament.findUnique({
      where: { id },
      include: {
        game: true,
        registrations: { include: { user: true } },
        teamApplications: {
          include: { members: true, captain: true },
        },
        matches: { orderBy: [{ round: "asc" }, { orderInRound: "asc" }] },
      },
    })) as TournamentDetails | null;
  } catch {
    tournament = null;
  }

  if (!tournament) {
    return <div className="w-full text-zinc-300">Турнир не найден.</div>;
  }

  const paidTeamsCount = tournament.teamApplications.filter((item) => item.status === "APPROVED").length;
  const autoPrizePoolMinor = Math.floor(paidTeamsCount * tournament.entryFeeMinor * 0.85);
  const first = Math.floor(autoPrizePoolMinor * 0.5);
  const second = Math.floor(autoPrizePoolMinor * 0.3);
  const third = autoPrizePoolMinor - first - second;
  const myRegistration = session
    ? tournament.registrations.find((registration) => registration.userId === session.sub)
    : null;
  const now = Date.now();
  const isFinishedByTime = tournament.endsAt ? new Date(tournament.endsAt).getTime() <= now : false;
  const canSubmitApplication = tournament.status === "REGISTRATION_OPEN" && !isFinishedByTime;
  const participantAssets: Record<string, { logoUrl?: string | null }> = {};
  for (const app of tournament.teamApplications) {
    const captainName = app.members.find((m) => m.isCaptain)?.username ?? app.captain.username;
    const isSolo = tournament.teamSize === 1 || / \(соло\)$/i.test(app.teamName);
    if (app.teamLogoUrl) {
      participantAssets[app.teamName] = { logoUrl: app.teamLogoUrl };
      participantAssets[captainName] = { logoUrl: app.teamLogoUrl };
    } else if (isSolo && app.captain.avatarUrl) {
      // Соло без логотипа команды: в сетке показываем аватар капитана.
      participantAssets[app.teamName] = { logoUrl: app.captain.avatarUrl };
      participantAssets[captainName] = { logoUrl: app.captain.avatarUrl };
    }
  }
  for (const reg of tournament.registrations) {
    if (reg.user.avatarUrl) participantAssets[reg.user.username] = { logoUrl: reg.user.avatarUrl };
  }

  const linkableUsernames = Array.from(
    new Set([
      ...tournament.registrations.map((r) => r.user.username),
      ...tournament.teamApplications.flatMap((app) => app.members.map((m) => m.username)),
    ]),
  );
  const linkSet = new Set(linkableUsernames);

  const podium =
    tournament.status === "COMPLETED"
      ? computeTournamentPodium(tournament.matches, tournament.format)
      : null;

  const applyHref = session
    ? `/tournaments/${tournament.id}/apply`
    : `/sign-in?next=${encodeURIComponent(`/tournaments/${tournament.id}/apply`)}`;
  const slotsLeft = Math.max(0, tournament.maxTeams - tournament.teamApplications.length);
  const matchesUnderway = tournament.status === "IN_PROGRESS";

  return (
    <div className="w-full">
      {matchesUnderway ? null : (
        <div className="sticky top-[7.5rem] z-20 mb-4">
          <CtaBox
            primary={{
              href: canSubmitApplication ? applyHref : `/tournaments/${tournament.id}`,
              label: canSubmitApplication ? "Подать заявку" : "Приём заявок закрыт",
            }}
            secondary={{ href: `/teammates?game=${encodeURIComponent(tournament.game.slug)}`, label: "Найти игроков" }}
            hint={`Формат ${tournament.teamSize} на ${tournament.teamSize} · ${
              tournament.entryFeeMinor > 0 ? `взнос ${formatRubFromMinor(tournament.entryFeeMinor)}` : "участие бесплатное"
            } · свободно ${slotsLeft} мест`}
          />
        </div>
      )}
      <GameCoverPanel slug={tournament.game.slug} className="ll-media-zoom" contentClassName="relative p-6">
        <span className="ll-beam ll-beam--a" aria-hidden />
        <span className="ll-beam ll-beam--b" aria-hidden />
        <Kicker>{tournament.game.name}</Kicker>
        <SplitHeading
          text={tournament.title}
          className="mt-2 text-3xl font-black uppercase tracking-[0.1em] text-[#14ffec]"
        />
        <Reveal delay={0.2}>
          <p className="mt-3 max-w-3xl text-zinc-300">{tournament.description ?? "Описание скоро появится."}</p>
          <div className="ll-meter mt-4 max-w-md">
            <span style={{ width: `${tournament.maxTeams > 0 ? Math.min(100, Math.round((tournament.teamApplications.length / tournament.maxTeams) * 100)) : 0}%` }} />
          </div>
        </Reveal>
        <StaggerGroup className="mt-4 grid gap-3 text-sm text-zinc-300 md:grid-cols-3" gap={0.09}>
          <StaggerItem className="h-full border border-[var(--ll-line)] bg-black/35 p-3 transition-colors duration-300 hover:border-[#14ffec]/45">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Кого допускаем</p>
            <p className="mt-1">
              {tournament.requiresVerifiedExperience
                ? "Только игроков с подтверждённым рангом"
                : "Всех желающих, подтверждать ранг не нужно"}
            </p>
            {tournament.requiresVerifiedExperience ? (
              <Link href="/account/questionnaire" className="mt-2 inline-block text-xs text-[#14ffec]">
                Как подтвердить ранг
              </Link>
            ) : null}
          </StaggerItem>
          <StaggerItem className="h-full border border-[var(--ll-line)] bg-black/35 p-3 transition-colors duration-300 hover:border-[#14ffec]/45">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Призовой фонд</p>
            {tournament.prizeMode === "SPONSOR" ? (
              <p className="mt-1">{tournament.sponsorPrizeText ?? "Объявим позже"}</p>
            ) : (
              <p className="mt-1">
                Собирается из взносов участников: 85% идёт победителям. Сейчас{" "}
                {formatRubFromMinor(autoPrizePoolMinor)} — за 1 место {formatRubFromMinor(first)}, за 2 место{" "}
                {formatRubFromMinor(second)}, за 3 место {formatRubFromMinor(third)}.
              </p>
            )}
          </StaggerItem>
          <StaggerItem className="h-full border border-[var(--ll-line)] bg-black/35 p-3 transition-colors duration-300 hover:border-[#14ffec]/45">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Состав и места</p>
            <p className="mt-1">
              {tournament.teamSize === 1
                ? "Играют по одному"
                : `Команды по ${tournament.teamSize} ${tournament.teamSize < 5 ? "игрока" : "игроков"}`}{" "}
              · заявились {tournament.teamApplications.length} из {tournament.maxTeams} ·{" "}
              {getTournamentStatusLabel(tournament.status)}
            </p>
          </StaggerItem>
        </StaggerGroup>
        {myRegistration ? (
          <p className="mt-4 text-sm text-[#14ffec]">
            Ваша заявка {getApplicationStatusLabel(myRegistration.status)}
          </p>
        ) : null}
      </GameCoverPanel>

      {canEditBracket ? (
        <Frame brackets className="mt-4">
          <Kicker>Управление</Kicker>
          <div className="mt-3">
            <TournamentAdminActions tournamentId={tournament.id} status={tournament.status} />
          </div>
        </Frame>
      ) : null}

      {podium ? (
        <TournamentPodium podium={podium} participantAssets={participantAssets} linkableUsernames={linkSet} />
      ) : tournament.status === "COMPLETED" ? (
        <section className="mt-6 rounded-xl border border-dashed border-[#323232] bg-[#1a1a1a]/50 p-4 text-sm text-zinc-500">
          Турнир завершён, но по сетке пока нельзя вычислить призёров (нет завершённых матчей с победителем). Обновите результаты в сетке и обновите страницу.
        </section>
      ) : null}

      {!matchesUnderway && (tournament.registrations.length > 0 || tournament.teamApplications.length > 0) && (
        <section className="ll-frame ll-frame--brackets mt-6 w-full p-6">
          <h2 className="text-lg font-black uppercase tracking-[0.12em] text-[#14ffec]">Участники</h2>
          <p className="mt-1 text-sm text-zinc-500">Нажмите на ник, чтобы открыть профиль игрока.</p>
          {tournament.registrations.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs uppercase tracking-[0.16em] text-zinc-400">Заявки от отдельных игроков</h3>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-200">
                {tournament.registrations.map((reg) => (
                  <li key={reg.id}>
                    <Link
                      href={`/u/${encodeURIComponent(reg.user.username)}`}
                      className="text-[#14ffec] underline decoration-[#323232] hover:decoration-[#14ffec]"
                    >
                      {reg.user.username}
                    </Link>
                    <span className="ml-1 text-zinc-500">({getApplicationStatusLabel(reg.status)})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tournament.teamApplications.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-xs uppercase tracking-[0.16em] text-zinc-400">Команды</h3>
              {tournament.teamApplications.map((app) => (
                <div key={app.id} className="ll-frame ll-hover-lift rounded-lg p-4">
                  <p className="font-semibold text-zinc-100">
                    {app.teamName}{" "}
                    <span className="text-xs font-normal uppercase tracking-wider text-zinc-500">
                      ({getApplicationStatusLabel(app.status)})
                    </span>
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-300">
                    {app.members.map((m) => (
                      <li key={m.id}>
                        <Link
                          href={`/u/${encodeURIComponent(m.username)}`}
                          className="text-[#14ffec] underline decoration-[#323232] hover:decoration-[#14ffec]"
                        >
                          {m.username}
                        </Link>
                        {m.isCaptain ? <span className="ml-1 text-zinc-500">капитан</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tournament.status !== "REGISTRATION_OPEN" && (
        <div id="bracket">
          <Hint className="mb-2">
            Карта сетки: колесо и pinch меняют масштаб, перетаскивание двигает карту. Нажмите на команду, чтобы
            увидеть состав. LIVE подсвечен, пока матч идёт сейчас.
          </Hint>
          <TournamentBracket
            format={tournament.format}
            matches={tournament.matches}
            canEdit={canEditBracket}
            rosters={buildParticipantRosters({
              teamSize: tournament.teamSize,
              registrations: tournament.registrations,
              teamApplications: tournament.teamApplications,
            })}
          />
        </div>
      )}
    </div>
  );
}
