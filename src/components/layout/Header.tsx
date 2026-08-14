import Link from "next/link";
import AccountMenu from "@/components/layout/AccountMenu";
import PublicImage from "@/components/ui/PublicImage";
import type { ShellData } from "@/lib/shellData";
import { cn } from "@/lib/cn";

const navLink =
  "ll-underline relative px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 transition-colors duration-200 hover:text-[#14ffec]";

export default function Header({
  shell,
  logoSrc,
}: {
  shell: ShellData;
  logoSrc?: string | null;
}) {
  const { session, canAdmin, unreadChats } = shell;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--ll-line)] bg-[#141414]/92 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5">
          {logoSrc && (
            <PublicImage
              src={logoSrc}
              alt="Lethal Line"
              width={28}
              height={28}
              className="h-7 w-7 object-contain transition-transform duration-500 group-hover:rotate-[8deg] group-hover:scale-105"
              priority
            />
          )}
          <span className="truncate text-[13px] font-black tracking-[0.22em] text-[#14ffec] transition-[letter-spacing] duration-500 group-hover:tracking-[0.28em]">
            LETHAL LINE
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/tournaments" className={navLink}>
            Турниры
          </Link>
          <Link href="/teammates" className={navLink}>
            Игроки
          </Link>
          {session && (
            <Link href="/chats" className={cn(navLink, "relative")}>
              Чаты
              {unreadChats > 0 && <span className="ll-dot-live absolute right-0.5 top-0.5" aria-hidden />}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {!session ? (
            <>
              <Link href="/sign-in" className="button-ghost hidden text-[11px] uppercase tracking-[0.14em] sm:inline-flex">
                Войти
              </Link>
              <Link href="/sign-in?mode=register" className="button-primary px-3 py-1.5 text-[11px] uppercase tracking-[0.12em]">
                Регистрация
              </Link>
            </>
          ) : (
            <AccountMenu username={session.username} canAdmin={canAdmin} />
          )}
        </div>
      </div>
    </header>
  );
}
