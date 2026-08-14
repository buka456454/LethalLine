import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export default function Kicker({
  children,
  className,
  index,
}: {
  children: ReactNode;
  className?: string;
  index?: string | number;
}) {
  return (
    <p className={cn("ll-kicker", className)}>
      {index != null ? (
        <span className="text-[#14ffec]/70">{`//${String(index).padStart(2, "0")} `}</span>
      ) : null}
      {children}
    </p>
  );
}
