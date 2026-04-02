"use client";

import { useState } from "react";
import { getGameCoverDecor, getGameCoverUrl } from "@/lib/gameAssets";
import PublicImage from "@/components/ui/PublicImage";

const OVERLAY_Z = ["z-[1]", "z-[2]", "z-[3]", "z-[4]"] as const;

type GameCoverImageStackProps = {
  slug: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * Обложка игры: картинка, лёгкое затемнение и цветовые градиенты по slug.
 * Контейнер обычно absolute inset-0 внутри панели с тем же getGameCoverDecor(slug).panelBgClass.
 */
export default function GameCoverImageStack({
  slug,
  alt,
  className = "",
  sizes,
  priority,
}: GameCoverImageStackProps) {
  const src = getGameCoverUrl(slug);
  const decor = getGameCoverDecor(slug);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className={`h-full min-h-0 w-full overflow-hidden ${className}`.trim()}
    >
      {src && !imgFailed ? (
        <PublicImage
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onImageError={() => setImgFailed(true)}
          className="z-0 object-cover brightness-[0.86] contrast-[1.04] saturate-[1.08] scale-[1.04]"
        />
      ) : null}
      {decor.overlayClasses.map((layer, i) => (
        <div
          key={i}
          className={`pointer-events-none absolute inset-0 ${OVERLAY_Z[i] ?? "z-[5]"} ${layer}`}
          aria-hidden
        />
      ))}
    </div>
  );
}
