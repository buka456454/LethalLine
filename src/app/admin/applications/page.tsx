import { redirect } from "next/navigation";
import ApplicationsModerationPanel from "@/components/admin/ApplicationsModerationPanel";
import { isOwnerAdminSession, readSession } from "@/lib/auth";
import Kicker from "@/components/ui/Kicker";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const session = await readSession();
  if (!session) redirect("/sign-in");
  if (!isOwnerAdminSession(session)) redirect("/tournaments");

  return (
    <div className="w-full space-y-4">
      <div>
        <Kicker index="01">заявки</Kicker>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-[0.1em] text-[#14ffec]">Модерация</h1>
      </div>
      <ApplicationsModerationPanel />
    </div>
  );
}
