import Link from "next/link";
import { cn } from "@/lib/cn";

export type TabItem = {
  href: string;
  label: string;
  active?: boolean;
};

export default function TabBar({ tabs, className }: { tabs: TabItem[]; className?: string }) {
  if (tabs.length === 0) return null;
  return (
    <nav className={cn("ll-tabbar", className)} aria-label="Разделы">
      {tabs.map((tab) => (
        <Link key={tab.href + tab.label} href={tab.href} className={cn("ll-tab", tab.active && "is-active")}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
