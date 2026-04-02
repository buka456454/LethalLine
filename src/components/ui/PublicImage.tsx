"use client";

import { useCallback, useState } from "react";

type Common = {
  src: string;
  alt: string;
  className?: string;
  /** eager для логотипа в шапке */
  priority?: boolean;
  /** Вызывается при ошибке загрузки (после скрытия картинки). */
  onImageError?: () => void;
};

type SizedProps = Common & {
  width: number;
  height: number;
  fill?: false;
};

type FillProps = Common & {
  fill: true;
  sizes?: string;
};

/** Нативный img: /uploads/* (раздача из storage через Route Handler), /logos, /games, внешние URL. */
export default function PublicImage(props: SizedProps | FillProps) {
  const { src, alt, className = "", priority, onImageError } = props;
  const [hidden, setHidden] = useState(false);

  const onError = useCallback(() => {
    setHidden(true);
    onImageError?.();
  }, [onImageError]);

  if (!src || hidden) return null;

  const loading = priority ? "eager" : "lazy";

  if ("fill" in props && props.fill) {
    return (
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 h-full w-full object-cover ${className}`.trim()}
        loading={loading}
        decoding="async"
        sizes={props.sizes}
        onError={onError}
      />
    );
  }

  const { width, height } = props as SizedProps;
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
      decoding="async"
      onError={onError}
    />
  );
}
