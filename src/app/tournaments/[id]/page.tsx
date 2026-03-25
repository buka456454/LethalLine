import { RegistrationStatus, TournamentFormat } from "@prisma/client";
import Link from "next/link";
import TournamentBracket from "@/components/bracket/TournamentBracket";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type TournamentDetails = {
  id: string;
  title: string;
  description: string | null;
  format: TournamentFormat;
  status: string;
  maxParticipants: number;
  game: { name: string };
  registrations: Array<{ id: string; status: RegistrationStatus; userId: string }>;
  teamApplications: Array<{
    id: string;
    teamName: string;
    teamLogoUrl: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    captainId: string;
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
  let tournament: TournamentDetails | null = null;

  try {
    tournament = (await prisma.tournament.findUnique({
      where: { id },
      include: {
        game: true,
        registrations: { include: { user: true } },
        teamApplications: {
          include: { members: true },
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

  const approved = tournament.registrations.filter((r) => r.status === RegistrationStatus.APPROVED);
  const myRegistration = session
    ? tournament.registrations.find((registration) => registration.userId === session.sub)
    : null;
  return (
    <div className="w-full">
      <section className="rounded-xl border border-[#323232] bg-[#212121] p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{tournament.game.name}</p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.1em] text-[#14ffec]">{tournament.title}</h1>
        <p className="mt-3 max-w-3xl text-zinc-300">{tournament.description ?? "Описание скоро появится."}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
          <span className="rounded bg-[#323232] px-2 py-1">{tournament.format}</span>
          <span>Статус: {tournament.status}</span>
          <span>
            Игроков: {approved.length}/{tournament.maxParticipants}
          </span>
        </div>
        <div className="mt-5">
          {session ? (
            <>
              {myRegistration && <p className="text-sm text-[#14ffec]">Статус вашей индивидуальной заявки: {myRegistration.status}</p>}
              <Link href={`/tournaments/${tournament.id}/apply`} className="button-primary inline-flex">
                Подать заявку на отдельной странице
              </Link>
            </>
          ) : (
            <p className="text-sm text-zinc-400">Войдите, чтобы подать заявку на участие.</p>
          )}
        </div>
      </section>

      <TournamentBracket format={tournament.format} matches={tournament.matches} />
    </div>
  );
}
