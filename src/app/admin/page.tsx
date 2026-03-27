import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AdminPanel from "@/components/admin/AdminPanel";
import { isOwnerAdminSession, readSession } from "@/lib/auth";
import { getBrandLogos, pickBrandLogo } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [session, logos] = await Promise.all([readSession(), getBrandLogos()]);
  if (!session) redirect("/sign-in");

  const allowed = isOwnerAdminSession(session);
  if (!allowed) redirect("/tournaments");

  const adminLogo = pickBrandLogo(logos, 1);

  return (
    <div className="w-full space-y-4">
      {adminLogo && (
        <div className="inline-flex items-center gap-3 rounded-lg border border-[#323232] bg-[#212121] px-3 py-2">
          <Image src={adminLogo.src} alt="Admin logo" width={30} height={30} className="h-7 w-7 object-contain" />
          <span className="text-xs uppercase tracking-[0.16em] text-zinc-400">Admin mode</span>
        </div>
      )}
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
      <AdminPanel />
    </div>
  );
}
