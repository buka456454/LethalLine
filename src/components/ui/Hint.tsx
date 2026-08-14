import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export default function Hint({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn("mt-2 text-xs leading-relaxed text-zinc-500", className)}>{children}</p>;
}
