"use client";

import { getGameCoverDecor } from "@/lib/gameAssets";
import GameCoverImageStack from "./GameCoverImageStack";

type GameCoverPanelProps = {
  slug: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  minHeightClassName?: string;
};

export default function GameCoverPanel({
  slug,
  children,
  className = "",
  contentClassName = "",
  minHeightClassName = "",
}: GameCoverPanelProps) {
  const decor = getGameCoverDecor(slug);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[#323232] ${decor.panelBgClass} ${minHeightClassName} ${className}`}
    >
      <GameCoverImageStack
        slug={slug}
        alt=""
        className="pointer-events-none absolute inset-0 z-0"
        sizes="(max-width: 768px) 100vw, min(960px, 100vw)"
      />
      <div className={`relative z-10 min-h-0 ${contentClassName}`}>{children}</div>
    </div>
  );
}
