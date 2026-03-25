import Link from "next/link";
import { redirect } from "next/navigation";
import ApplicationsModerationPanel from "@/components/admin/ApplicationsModerationPanel";
import { isOwnerAdminSession, readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const session = await readSession();
  if (!session) redirect("/sign-in");
  if (!isOwnerAdminSession(session)) redirect("/tournaments");

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin" className="rounded-lg border border-[#323232] bg-[#212121] px-4 py-2 text-sm text-zinc-200 hover:text-[#14ffec]">
          Назад в админку
        </Link>
      </div>
      <ApplicationsModerationPanel />
    </div>
  );
}
