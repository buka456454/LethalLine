import { redirect } from "next/navigation";
import { isOwnerAdminSession, readSession } from "@/lib/auth";
import TournamentCreateManager from "@/components/admin/TournamentCreateManager";
import Kicker from "@/components/ui/Kicker";

export const dynamic = "force-dynamic";

export default async function AdminTournamentCreatePage() {
  const session = await readSession();
  if (!session) redirect("/sign-in");
  if (!isOwnerAdminSession(session)) redirect("/tournaments");

  return (
    <div className="w-full space-y-4">
      <div>
        <Kicker index="02">турнир</Kicker>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-[0.1em] text-[#14ffec]">Создание турнира</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Формат, число мест, взнос и требование к подтверждённому рангу. Призовой фонд делится 50/30/20 между первыми
          тремя местами.
        </p>
      </div>
      <TournamentCreateManager />
    </div>
  );
}
