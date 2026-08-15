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
  gameId: string;
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
  const { id } = await params;
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(`/tournaments/${id}/apply`)}`);
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

  const gameProfile = await prisma.userGameProfile.findFirst({
    where: { userId: session.sub, gameId: tournament.gameId },
    select: { experienceVerificationStatus: true },
  });
  const experienceVerified = gameProfile?.experienceVerificationStatus === "APPROVED";

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, displayName: true, avatarUrl: true },
  });
  if (!me) redirect("/sign-in");

  return (
    <div className="w-full space-y-4">
      <Link href={`/tournaments/${tournament.id}`} className="button-ghost inline-flex text-xs uppercase tracking-[0.12em]">
        ← к турниру
      </Link>

      <GameCoverPanel slug={tournament.game.slug} contentClassName="p-6">
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">{tournament.game.name}</p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.1em] text-[#14ffec]">{tournament.title}</h1>
        <p className="mt-2 text-sm text-zinc-300">
          {getTournamentStatusLabel(tournament.status)} · заявились {usedSlots} из {tournament.maxTeams} команд ·{" "}
          {tournament.teamSize === 1 ? "играют по одному" : `по ${tournament.teamSize} игроков в команде`}
          {tournament.entryFeeMinor > 0
            ? ` · взнос ${(tournament.entryFeeMinor / 100).toFixed(0)} ₽`
            : " · участие бесплатное"}
        </p>
        {tournament.requiresVerifiedExperience && !experienceVerified ? (
          <p className="mt-3 border border-[var(--ll-line)] bg-black/40 px-3 py-2 text-sm text-zinc-200">
            В этот турнир допускают только игроков с подтверждённым рангом.{" "}
            <Link href="/account/questionnaire" className="text-[#14ffec]">
              Приложить скриншот в анкете
            </Link>
          </p>
        ) : null}
      </GameCoverPanel>

      <TournamentApplicationManager
        tournamentId={tournament.id}
        teamSize={tournament.teamSize}
        entryFeeMinor={tournament.entryFeeMinor}
        currency={tournament.currency}
        requiresVerifiedExperience={tournament.requiresVerifiedExperience}
        experienceVerified={experienceVerified}
        existingTeamApplication={myTeamApplication}
        canSubmitApplication={canSubmitApplication}
        captain={{
          username: me.username,
          displayName: me.displayName,
          avatarUrl: me.avatarUrl,
        }}
      />
    </div>
  );
}
