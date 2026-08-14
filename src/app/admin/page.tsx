import { redirect } from "next/navigation";
import AdminPanel from "@/components/admin/AdminPanel";
import { canAccessAdminTabSession, canManageNewsSession, canManageStreamCommentSession, isOwnerAdminSession, readSession } from "@/lib/auth";
import Kicker from "@/components/ui/Kicker";
import Reveal from "@/components/motion/Reveal";
import SplitHeading from "@/components/motion/SplitHeading";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await readSession();
  if (!session) redirect("/sign-in");

  const allowed = canAccessAdminTabSession(session);
  if (!allowed) redirect("/tournaments");
  const isOwner = isOwnerAdminSession(session);
  const canManageNews = canManageNewsSession(session);
  const canManageStreamComment = canManageStreamCommentSession(session);
  const isJournalistOnly = !isOwner && canManageNews && !canManageStreamComment;

  return (
    <div className="w-full space-y-4">
      <Reveal>
        <Kicker index="00">{isJournalistOnly ? "journalist" : "admin"}</Kicker>
        <SplitHeading text="Панель" className="mt-1 text-3xl font-black uppercase tracking-[0.12em] text-[#14ffec]" />
        <p className="mt-2 text-sm text-zinc-500">
          Вкладки сверху: обзор, заявки, турнир, матч. Ниже — контент и метрики.
        </p>
      </Reveal>
      <AdminPanel isOwner={isOwner} canManageNews={canManageNews} canManageStreamComment={canManageStreamComment} />
    </div>
  );
}
