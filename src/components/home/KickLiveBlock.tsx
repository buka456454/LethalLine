"use client";

import * as React from "react";
import Frame from "@/components/ui/Frame";
import Kicker from "@/components/ui/Kicker";

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
    <Frame pad={false} brackets className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <div>
          <div className="flex items-center gap-3">
            <Kicker index="03">Прямой эфир</Kicker>
            <span className="ll-eq" aria-hidden>
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
          </div>
          <h2 className="mt-2 text-lg font-black uppercase tracking-[0.1em] text-[#14ffec]">{title}</h2>
        </div>
        <a
          href={profileUrl}
          target="_blank"
          rel="noreferrer"
          className="ll-underline text-[10px] uppercase tracking-[0.16em] text-zinc-500 hover:text-[#14ffec]"
        >
          kick.com/{channel} ↗
        </a>
      </div>
      <div className="relative mt-4 aspect-video w-full bg-black">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={playerSrc}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="origin-when-cross-origin"
          title={`Kick stream ${channel}`}
        />
      </div>
      {streamComment ? (
        <p className="flex items-start gap-3 border-t border-[var(--ll-line)] px-5 py-3 text-sm text-zinc-300">
          <span className="ll-dot-live mt-1.5 shrink-0" aria-hidden />
          {streamComment}
        </p>
      ) : null}
    </Frame>
  );
}
