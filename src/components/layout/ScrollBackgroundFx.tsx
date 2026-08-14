"use client";

import { useEffect } from "react";

export default function ScrollBackgroundFx() {
  useEffect(() => {
    const root = document.documentElement;
    let rafId = 0;

    const update = () => {
      rafId = 0;
      const maxScrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const scrollY = window.scrollY;
      const progress = Math.min(1, Math.max(0, scrollY / maxScrollable));
      root.style.setProperty("--ll-scroll-y", String(scrollY));
      root.style.setProperty("--ll-scroll-p", progress.toFixed(4));
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div aria-hidden className="scroll-bg-fx">
      <div className="scroll-bg-watermark">LETHAL LINE</div>
    </div>
  );
}
