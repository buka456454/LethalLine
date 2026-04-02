import { redirect } from "next/navigation";
import Link from "next/link";
import AdminPanel from "@/components/admin/AdminPanel";
import { canAccessAdminTabSession, canManageNewsSession, canManageStreamCommentSession, isOwnerAdminSession, readSession } from "@/lib/auth";
import { getBrandLogos, pickBrandLogo } from "@/lib/brand";
import PublicImage from "@/components/ui/PublicImage";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [session, logos] = await Promise.all([readSession(), getBrandLogos()]);
  if (!session) redirect("/sign-in");

  const allowed = canAccessAdminTabSession(session);
  if (!allowed) redirect("/tournaments");
  const isOwner = isOwnerAdminSession(session);
  const canManageNews = canManageNewsSession(session);
  const canManageStreamComment = canManageStreamCommentSession(session);
  const isJournalistOnly = !isOwner && canManageNews && !canManageStreamComment;

  const adminLogo = pickBrandLogo(logos, 1);

  return (
    <div className="w-full space-y-4">
      {adminLogo && (
        <div className="inline-flex items-center gap-3 rounded-lg border border-[#323232] bg-[#212121] px-3 py-2">
          <PublicImage src={adminLogo.src} alt="Admin logo" width={30} height={30} className="h-7 w-7 object-contain" />
          <span className="text-xs uppercase tracking-[0.16em] text-zinc-400">
            {isJournalistOnly ? "Journalist mode" : "Admin mode"}
          </span>
        </div>
      )}
      {isOwner && (
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/applications" className="button-primary">
            Центр модерации заявок
          </Link>
          <Link
            href="/admin/tournaments/new"
            className="rounded-lg border border-[#323232] bg-[#323232] px-4 py-3 text-sm font-semibold text-zinc-200 hover:text-[#14ffec]"
          >
            Создать турнир
          </Link>
          <Link
            href="/admin/matches/new"
            className="rounded-lg border border-[#323232] bg-[#323232] px-4 py-3 text-sm font-semibold text-zinc-200 hover:text-[#14ffec]"
          >
            Создать матч
          </Link>
        </div>
      )}
      <AdminPanel isOwner={isOwner} canManageNews={canManageNews} canManageStreamComment={canManageStreamComment} />
    </div>
  );
}
