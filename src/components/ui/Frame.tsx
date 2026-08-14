import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export default function Frame({
  children,
  className,
  pad = true,
  brackets = false,
  hover = false,
  grid = false,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
  brackets?: boolean;
  hover?: boolean;
  grid?: boolean;
}) {
  return (
    <section
      className={cn(
        "ll-frame",
        pad && "p-5 sm:p-6",
        brackets && "ll-frame--brackets",
        hover && "ll-hover-lift",
        grid && "ll-grid",
        className,
      )}
    >
      {children}
    </section>
  );
}
