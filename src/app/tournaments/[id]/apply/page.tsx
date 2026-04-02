import Link from "next/link";
import { RegistrationStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import GameCoverPanel from "@/components/games/GameCoverPanel";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTournamentStatusLabel } from "@/lib/tournamentStatus";
import TournamentApplicationManager from "@/components/tournaments/TournamentApplicationManager";

export const dynamic = "force-dynamic";

type TournamentApplyDetails = {
  id: string;
  title: string;
  game: { name: string; slug: string };
  status: string;
  endsAt: Date | null;
  teamSize: 1 | 2 | 5;
  maxTeams: number;
  maxParticipants: number;
  requiresVerifiedExperience: boolean;
  entryFeeMinor: number;
  currency: "RUB";
  prizeMode: "ENTRY_FEES" | "SPONSOR";
  sponsorPrizeText: string | null;
  registrations: Array<{ id: string; status: RegistrationStatus; userId: string }>;
  teamApplications: Array<{
    id: string;
    teamName: string;
    teamLogoUrl: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    paymentStatus: "UNPAID" | "PENDING" | "PAID" | "REFUND_PENDING" | "REFUNDED" | "REFUND_FAILED";
    captainId: string;
    members: Array<{ id: string; username: string; isCaptain: boolean }>;
  }>;
};

export default async function TournamentApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  const tournament = (await prisma.tournament.findUnique({
    where: { id },
    include: {
      game: true,
      registrations: true,
      teamApplications: {
        include: { members: true },
      },
    },
  })) as TournamentApplyDetails | null;

  if (!tournament) {
    return <div className="w-full text-zinc-300">Турнир не найден.</div>;
  }

  const myTeamApplication = tournament.teamApplications.find((application) => application.captainId === session.sub) ?? null;
  const usedSlots = tournament.teamApplications.length;
  const now = Date.now();
  const isCompleted = tournament.status === "COMPLETED";
  const isFinishedByTime = tournament.endsAt ? new Date(tournament.endsAt).getTime() <= now : false;
  const canSubmitApplication = tournament.status === "REGISTRATION_OPEN" && !isFinishedByTime && !isCompleted;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/tournaments/${tournament.id}`}
          className="rounded-lg border border-[#323232] bg-[#212121] px-4 py-2 text-sm text-zinc-200 hover:text-[#14ffec]"
        >
          Назад к турниру
        </Link>
      </div>

      <GameCoverPanel slug={tournament.game.slug} contentClassName="p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-zinc-300">{tournament.game.name}</p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.1em] text-[#14ffec]">{tournament.title}</h1>
        <p className="mt-2 text-sm text-zinc-200">
          Статус: {getTournamentStatusLabel(tournament.status)} | Команд: {usedSlots}/{tournament.maxTeams} | Участников:{" "}
          {usedSlots * tournament.teamSize}/{tournament.maxParticipants}
        </p>
        <p className="mt-2 text-sm text-zinc-200">
          Формат команды: {tournament.teamSize === 1 ? "Соло" : tournament.teamSize === 2 ? "Дуо" : "Пати"} ({tournament.teamSize} чел.)
        </p>
        {tournament.requiresVerifiedExperience && (
          <p className="mt-2 text-sm text-zinc-200">
            Для участия нужен подтвержденный опыт в игре. Если еще не подтверждено, загрузите скриншот в анкете и дождитесь модерации.
          </p>
        )}
      </GameCoverPanel>

      <TournamentApplicationManager
        tournamentId={tournament.id}
        teamSize={tournament.teamSize}
        entryFeeMinor={tournament.entryFeeMinor}
        currency={tournament.currency}
        requiresVerifiedExperience={tournament.requiresVerifiedExperience}
        existingTeamApplication={myTeamApplication}
        canSubmitApplication={canSubmitApplication}
      />
    </div>
  );
}
