import Link from "next/link";
import type { ShellData } from "@/lib/shellData";
import { cn } from "@/lib/cn";

export default function MobileDock({ shell }: { shell: ShellData }) {
  const { session, unreadChats, cup } = shell;
  const applyHref = cup ? `/tournaments/${cup.id}/apply` : "/sign-in?mode=register";
  const centerHref = session
    ? cup?.status === "REGISTRATION_OPEN"
      ? applyHref
      : `/tournaments/${cup?.id ?? ""}`
    : "/sign-in?mode=register";
  const centerLabel = session ? (cup?.status === "REGISTRATION_OPEN" ? "Заявка" : "Турнир") : "Начать";
  const item =
    "flex flex-1 flex-col items-center gap-0.5 py-2 text-[9px] uppercase tracking-[0.14em] text-zinc-500 transition-colors duration-200 active:text-[#14ffec]";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ll-line)] bg-[#141414]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex items-end">
        <Link href="/tournaments" className={item}>
          Турниры
        </Link>
        <Link href="/teammates" className={item}>
          Игроки
        </Link>
        <Link
          href={centerHref || "/tournaments"}
          className="button-primary mb-1 grid h-11 min-w-11 shrink-0 place-items-center rounded-sm px-2 text-[9px] font-black uppercase tracking-[0.08em]"
        >
          {centerLabel}
        </Link>
        {session ? (
          <Link href="/chats" className={cn(item, "relative")}>
            Чаты
            {unreadChats > 0 ? <span className="ll-dot-live absolute right-5 top-1.5" /> : null}
          </Link>
        ) : (
          <Link href="/sign-in" className={item}>
            Войти
          </Link>
        )}
        {session ? (
          <Link href={`/u/${encodeURIComponent(session.username)}`} className={item}>
            Профиль
          </Link>
        ) : (
          <Link href="/guide" className={item}>
            Помощь
          </Link>
        )}
      </div>
    </nav>
  );
}
