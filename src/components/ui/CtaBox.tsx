import Link from "next/link";
import { cn } from "@/lib/cn";
import Hint from "@/components/ui/Hint";

export default function CtaBox({
  primary,
  secondary,
  hint,
  className,
}: {
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("ll-cta-box group", className)}>
      <span className="ll-cta-arrow transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden>
        ↗
      </span>
      <Link
        href={primary.href}
        className="button-primary inline-flex w-full items-center justify-center gap-2 text-center"
      >
        {primary.label}
        <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
          →
        </span>
      </Link>
      {secondary ? (
        <Link href={secondary.href} className="button-secondary mt-2 inline-flex w-full justify-center text-center">
          {secondary.label}
        </Link>
      ) : null}
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}
