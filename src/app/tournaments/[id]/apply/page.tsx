import Link from "next/link";
import { RegistrationStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TournamentApplicationManager from "@/components/tournaments/TournamentApplicationManager";

export const dynamic = "force-dynamic";

type TournamentApplyDetails = {
  id: string;
  title: string;
  game: { name: string };
  status: string;
  maxParticipants: number;
  entryFeeMinor: number;
  currency: "RUB";
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

  const myRegistration = tournament.registrations.find((registration) => registration.userId === session.sub);
  const myTeamApplication = tournament.teamApplications.find((application) => application.captainId === session.sub) ?? null;
  const usedSlots = tournament.registrations.length + tournament.teamApplications.length;

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

      <section className="rounded-xl border border-[#323232] bg-[#212121] p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{tournament.game.name}</p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.1em] text-[#14ffec]">{tournament.title}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Статус регистрации: {tournament.status} | Слоты: {usedSlots}/{tournament.maxParticipants}
        </p>
        {myRegistration && <p className="mt-3 text-sm text-[#14ffec]">Ваша индивидуальная заявка: {myRegistration.status}</p>}
      </section>

      <TournamentApplicationManager
        tournamentId={tournament.id}
        entryFeeMinor={tournament.entryFeeMinor}
        currency={tournament.currency}
        existingTeamApplication={myTeamApplication}
      />
    </div>
  );
}
