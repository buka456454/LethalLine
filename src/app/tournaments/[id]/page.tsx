import { RegistrationStatus, TournamentFormat } from "@prisma/client";
import Link from "next/link";
import TournamentBracket from "@/components/bracket/TournamentBracket";
import GameCoverPanel from "@/components/games/GameCoverPanel";
import TournamentAdminActions from "@/components/tournaments/TournamentAdminActions";
import TournamentPodium from "@/components/tournaments/TournamentPodium";
import { isOwnerAdminSession, readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTournamentStatusLabel } from "@/lib/tournamentStatus";
import { computeTournamentPodium } from "@/lib/tournamentPodium";

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
    captain: { username: string };
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
    if (app.teamLogoUrl) participantAssets[app.teamName] = { logoUrl: app.teamLogoUrl };
    const captainName = app.members.find((m) => m.isCaptain)?.username ?? app.captain.username;
    if (app.teamLogoUrl) participantAssets[captainName] = { logoUrl: app.teamLogoUrl };
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

  return (
    <div className="w-full">
      <GameCoverPanel slug={tournament.game.slug} contentClassName="p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-zinc-300">{tournament.game.name}</p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.1em] text-[#14ffec]">{tournament.title}</h1>
        <p className="mt-3 max-w-3xl text-zinc-200">{tournament.description ?? "Описание скоро появится."}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-200">
          <span className="rounded bg-black/45 px-2 py-1 backdrop-blur-sm">{tournament.format}</span>
          <span>Статус: {getTournamentStatusLabel(tournament.status)}</span>
          <span>Формат команды: {tournament.teamSize === 1 ? "Соло" : tournament.teamSize === 2 ? "Дуо" : "Пати"}</span>
          <span>Команд: {tournament.teamApplications.length}/{tournament.maxTeams}</span>
          <span>Участников: {tournament.teamApplications.length * tournament.teamSize}/{tournament.maxParticipants}</span>
          {tournament.requiresVerifiedExperience ? <span>Требуется подтвержденный опыт</span> : null}
        </div>
        <div className="mt-3 rounded bg-black/50 p-3 text-sm text-zinc-200 backdrop-blur-sm">
          {tournament.prizeMode === "SPONSOR" ? (
            <p>Приз от спонсора: {tournament.sponsorPrizeText ?? "Будет объявлен позже"}</p>
          ) : (
            <div className="space-y-1">
              <p>Призовой от взносов (85%): {(autoPrizePoolMinor / 100).toFixed(2)} RUB</p>
              <p>
                1 место: {(first / 100).toFixed(2)} RUB | 2 место: {(second / 100).toFixed(2)} RUB | 3 место:{" "}
                {(third / 100).toFixed(2)} RUB
              </p>
            </div>
          )}
        </div>
        <div className="mt-5">
          {session ? (
            <>
              {myRegistration && <p className="text-sm text-[#14ffec]">Статус вашей индивидуальной заявки: {myRegistration.status}</p>}
              {canSubmitApplication ? (
                <Link href={`/tournaments/${tournament.id}/apply`} className="button-primary inline-flex">
                  Подать заявку на отдельной странице
                </Link>
              ) : (
                <p className="text-sm text-zinc-400">Подача заявок закрыта (турнир завершён).</p>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-400">Войдите, чтобы подать заявку на участие.</p>
          )}
        </div>
        {canEditBracket ? <TournamentAdminActions tournamentId={tournament.id} status={tournament.status} /> : null}
      </GameCoverPanel>

      {podium ? (
        <TournamentPodium podium={podium} participantAssets={participantAssets} linkableUsernames={linkSet} />
      ) : tournament.status === "COMPLETED" ? (
        <section className="mt-6 rounded-xl border border-dashed border-[#323232] bg-[#1a1a1a]/50 p-4 text-sm text-zinc-500">
          Турнир завершён, но по сетке пока нельзя вычислить призёров (нет завершённых матчей с победителем). Обновите результаты в сетке и обновите страницу.
        </section>
      ) : null}

      {(tournament.registrations.length > 0 || tournament.teamApplications.length > 0) && (
        <section className="surface mt-6 w-full rounded-xl p-6">
          <h2 className="text-lg font-black uppercase tracking-[0.12em] text-[#14ffec]">Участники</h2>
          <p className="mt-1 text-sm text-zinc-500">Имя ведёт на публичный профиль на сайте (если аккаунт существует).</p>
          {tournament.registrations.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs uppercase tracking-[0.16em] text-zinc-400">Индивидуальные заявки</h3>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-200">
                {tournament.registrations.map((reg) => (
                  <li key={reg.id}>
                    <Link
                      href={`/u/${encodeURIComponent(reg.user.username)}`}
                      className="text-[#14ffec] underline decoration-[#323232] hover:decoration-[#14ffec]"
                    >
                      {reg.user.username}
                    </Link>
                    <span className="ml-1 text-zinc-500">({reg.status})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tournament.teamApplications.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-xs uppercase tracking-[0.16em] text-zinc-400">Команды</h3>
              {tournament.teamApplications.map((app) => (
                <div key={app.id} className="rounded-lg border border-[#323232] bg-[#212121] p-4">
                  <p className="font-semibold text-zinc-100">
                    {app.teamName}{" "}
                    <span className="text-xs font-normal uppercase tracking-wider text-zinc-500">({app.status})</span>
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
        <TournamentBracket
          format={tournament.format}
          matches={tournament.matches}
          canEdit={canEditBracket}
          participantAssets={participantAssets}
          linkableUsernames={linkableUsernames}
        />
      )}
    </div>
  );
}
