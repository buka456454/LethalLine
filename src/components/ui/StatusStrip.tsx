import Link from "next/link";
import { cn } from "@/lib/cn";

export default function StatusStrip({
  items,
  className,
}: {
  items: Array<{ label: string; value: string; href?: string; live?: boolean }>;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={cn("ll-status-strip", className)}>
      {items.map((item, i) => {
        const body = (
          <>
            {item.live ? <span className="ll-dot-live" aria-hidden /> : null}
            <span className="text-zinc-500">{item.label}</span>
            <span className="text-zinc-200">{item.value}</span>
          </>
        );
        return item.href ? (
          <Link
            key={`${item.label}-${i}`}
            href={item.href}
            className="ll-status-cell transition-colors duration-200 hover:text-[#14ffec]"
          >
            {body}
          </Link>
        ) : (
          <span key={`${item.label}-${i}`} className="ll-status-cell">
            {body}
          </span>
        );
      })}
    </div>
  );
}
