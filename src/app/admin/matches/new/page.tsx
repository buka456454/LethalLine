import Link from "next/link";
import { redirect } from "next/navigation";
import { isOwnerAdminSession, readSession } from "@/lib/auth";
import SaiIcon from "@/components/ui/SaiIcon";
import MatchCreateManager from "@/components/admin/MatchCreateManager";

export const dynamic = "force-dynamic";

export default async function AdminMatchCreatePage() {
  const session = await readSession();
  if (!session) redirect("/sign-in");
  if (!isOwnerAdminSession(session)) redirect("/tournaments");

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin"
          className="rounded-lg border border-[#323232] bg-[#212121] px-4 py-2 text-sm text-zinc-200 hover:text-[#14ffec]"
        >
          Назад в админку
        </Link>
      </div>

      <section className="surface rounded-2xl p-6">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
          <SaiIcon name="video" size={14} />
          Match manager
        </p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.1em] text-[#14ffec]">Создание матча</h1>
        <p className="mt-3 text-sm text-zinc-300">
          Здесь можно вручную добавить матч в турнир (если нужно вне сетки) или быстро создать тестовый матч для трансляции.
        </p>
      </section>

      <MatchCreateManager />
    </div>
  );
}

