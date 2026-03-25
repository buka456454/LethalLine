import Link from "next/link";
import Image from "next/image";
import { isOwnerAdminSession, readSession } from "@/lib/auth";
import LogoutButton from "@/components/ui/LogoutButton";
import { getBrandLogos, pickBrandLogo } from "@/lib/brand";
import SaiIcon from "@/components/ui/SaiIcon";

const linkClass =
  "inline-flex items-center gap-2 rounded-md border border-transparent px-3 py-2 text-sm text-zinc-300 transition hover:border-[#0d7377] hover:text-[#14ffec]";

export default async function Header() {
  const [session, logos] = await Promise.all([readSession(), getBrandLogos()]);
  const canAdmin = session ? isOwnerAdminSession(session) : false;
  const headerLogo = pickBrandLogo(logos, 3) ?? pickBrandLogo(logos, 0);

  return (
    <header className="sticky top-0 z-20 border-b border-[#323232] bg-[#212121]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          {headerLogo && (
            <Image
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
          {session && (
            <Link href="/account" className={linkClass}>
              <SaiIcon name="user" />
              Аккаунт
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
          {session && <LogoutButton username={session.username} />}
        </nav>
      </div>
    </header>
  );
}
