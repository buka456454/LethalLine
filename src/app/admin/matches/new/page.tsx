import { redirect } from "next/navigation";
import { isOwnerAdminSession, readSession } from "@/lib/auth";
import MatchCreateManager from "@/components/admin/MatchCreateManager";
import Kicker from "@/components/ui/Kicker";

export const dynamic = "force-dynamic";

export default async function AdminMatchCreatePage() {
  const session = await readSession();
  if (!session) redirect("/sign-in");
  if (!isOwnerAdminSession(session)) redirect("/tournaments");

  return (
    <div className="w-full space-y-4">
      <div>
        <Kicker index="03">матч</Kicker>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-[0.1em] text-[#14ffec]">Создание матча</h1>
        <p className="mt-2 text-sm text-zinc-500">Ручной матч вне сетки или тестовый слот под эфир.</p>
      </div>
      <MatchCreateManager />
    </div>
  );
}
