"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import TabBar, { type TabItem } from "@/components/ui/TabBar";

function tournamentIdFromPath(pathname: string) {
  const match = pathname.match(/^\/tournaments\/([^/]+)/);
  if (!match) return null;
  if (match[1] === "new") return null;
  return match[1];
}

export default function ContextTabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tournamentId = tournamentIdFromPath(pathname);
  let tabs: TabItem[] = [];

  if (tournamentId) {
    const base = `/tournaments/${tournamentId}`;
    tabs = [
      { href: base, label: "Обзор", active: pathname === base },
      { href: `${base}#bracket`, label: "Сетка", active: false },
      { href: `${base}/apply`, label: "Заявка", active: pathname.endsWith("/apply") },
    ];
  } else if (pathname.startsWith("/admin")) {
    tabs = [
      { href: "/admin", label: "Обзор", active: pathname === "/admin" },
      { href: "/admin/applications", label: "Заявки", active: pathname.startsWith("/admin/applications") },
      { href: "/admin/tournaments/new", label: "Турнир", active: pathname.startsWith("/admin/tournaments") },
      { href: "/admin/matches/new", label: "Матч", active: pathname.startsWith("/admin/matches") },
    ];
  } else if (pathname.startsWith("/friends")) {
    const tab = searchParams.get("tab") ?? "friends";
    tabs = [
      { href: "/friends", label: "Друзья", active: tab === "friends" },
      { href: "/friends?tab=incoming", label: "Входящие", active: tab === "incoming" },
      { href: "/friends?tab=outgoing", label: "Исходящие", active: tab === "outgoing" },
    ];
  }

  if (tabs.length === 0) return null;
  return (
    <motion.div
      className="border-b border-[var(--ll-line)] bg-[#141414]/80 px-4 py-2"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <TabBar tabs={tabs} />
        {pathname.startsWith("/admin") ? (
          <Link
            href="/admin"
            className="ll-underline relative hidden text-[10px] uppercase tracking-[0.16em] text-zinc-500 transition-colors duration-200 hover:text-[#14ffec] sm:inline"
          >
            панель
          </Link>
        ) : null}
      </div>
    </motion.div>
  );
}
