"use client";

import * as React from "react";

function buildKickPlayerSrc(channel: string) {
  const url = new URL(`https://player.kick.com/${encodeURIComponent(channel)}`);
  url.searchParams.set("muted", "true");
  return url.toString();
}

export default function KickLiveBlock({
  channel,
  profileUrl,
  streamComment,
  title = "Сейчас в эфире на Kick",
}: {
  channel: string;
  profileUrl: string;
  streamComment?: string;
  title?: string;
}) {
  const playerSrc = React.useMemo(() => buildKickPlayerSrc(channel), [channel]);

  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-300/80">Live</p>
            <h2 className="mt-2 text-lg font-black uppercase tracking-[0.12em] text-[#14ffec] sm:text-xl">{title}</h2>
          </div>
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-200/90 backdrop-blur transition hover:bg-black/55 hover:text-[#53fc18]"
          >
            kick.com/{channel}
          </a>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-black shadow-[0_18px_60px_rgba(0,0,0,0.65)]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/70" />
          <div className="pointer-events-none absolute -inset-20 bg-[radial-gradient(circle_at_35%_25%,rgba(83,252,24,0.12),transparent_55%)]" />

          <div className="relative aspect-video w-full">
            <iframe
              className="absolute inset-0 h-full w-full opacity-95"
              src={playerSrc}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="origin-when-cross-origin"
              title={`Kick stream ${channel}`}
            />

            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#53fc18] to-transparent opacity-40" />
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_20%,transparent_80%,rgba(255,255,255,0.03))]" />
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 sm:p-5" />
          </div>
        </div>
        {streamComment && (
          <article className="mt-3 rounded-xl border border-[#53fc18]/35 bg-[#111616] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#53fc18]">Комментарий к трансляции</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-200">{streamComment}</p>
          </article>
        )}
      </div>
    </section>
  );
}
