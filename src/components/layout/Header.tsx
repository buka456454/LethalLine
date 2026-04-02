import Link from "next/link";
import { canAccessAdminTabSession, readSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/ui/LogoutButton";
import PublicImage from "@/components/ui/PublicImage";
import { getBrandLogos, pickBrandLogo } from "@/lib/brand";
import SaiIcon from "@/components/ui/SaiIcon";

const linkClass =
  "inline-flex items-center gap-2 rounded-md border border-transparent px-3 py-2 text-sm text-zinc-300 transition hover:border-[#0d7377] hover:text-[#14ffec]";

export default async function Header() {
  const [session, logos] = await Promise.all([readSession(), getBrandLogos()]);
  const unreadChatsCount = session
    ? await prisma.chatMessage.count({
        where: {
          readAt: null,
          senderId: { not: session.sub },
          dialog: {
            OR: [{ participantAId: session.sub }, { participantBId: session.sub }],
          },
        },
      })
    : 0;
  const hasUnreadChats = unreadChatsCount > 0;
  const canAdmin = session ? canAccessAdminTabSession(session) : false;
  const headerLogo = pickBrandLogo(logos, 3) ?? pickBrandLogo(logos, 0);

  return (
    <header className="sticky top-0 z-20 border-b border-[#323232] bg-[#212121]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          {headerLogo && (
            <PublicImage
              src={headerLogo.src}
              alt="Lethal Line logo"
              width={34}
              height={34}
              className="h-[34px] w-[34px] object-contain"
              priority
            />
          )}
          <span className="text-xl font-black tracking-[0.2em] text-[#14ffec]">LETHAL LINE</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/tournaments" className={linkClass}>
            <SaiIcon name="calendar" />
            Турниры
          </Link>
          <Link href="/teammates" className={linkClass}>
            <SaiIcon name="search" />
            Игроки
          </Link>
          {session && (
            <Link href="/chats" className={`${linkClass} relative`}>
              <SaiIcon name="chat" />
              Чаты
              {hasUnreadChats && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#14ffec]" aria-hidden />}
            </Link>
          )}
          {!session && (
            <Link href="/sign-in" className={linkClass}>
              <SaiIcon name="file" />
              Войти
            </Link>
          )}
          {canAdmin && (
            <Link href="/admin" className={linkClass}>
              <SaiIcon name="settings" />
              Админ
            </Link>
          )}
          {session && (
            <details className="account-menu group relative">
              <summary className="inline-flex list-none cursor-pointer select-none items-center gap-2 rounded-md border border-[#14ffec]/50 bg-[#0d7377]/25 px-3 py-2 text-sm font-semibold text-[#14ffec] transition hover:border-[#14ffec] hover:bg-[#0d7377]/40">
                <SaiIcon name="user" />
                {session.username}
              </summary>
              <div className="account-menu-panel absolute right-0 top-full z-30 mt-2 w-44 rounded-lg border border-[#323232] bg-[#212121] p-1 shadow-lg shadow-black/40">
                <Link
                  href={`/u/${encodeURIComponent(session.username)}`}
                  className="block rounded-md px-3 py-2 text-sm text-zinc-200 transition hover:bg-[#2a2a2a] hover:text-[#14ffec]"
                >
                  Профиль
                </Link>
                <div className="px-1 py-1">
                  <LogoutButton
                    label="Выход"
                    className="w-full rounded-md border border-[#323232] bg-[#323232] px-3 py-2 text-left text-sm text-zinc-200 transition hover:border-[#0d7377] hover:text-[#14ffec] disabled:opacity-60"
                  />
                </div>
              </div>
            </details>
          )}
        </nav>
      </div>
    </header>
  );
}
