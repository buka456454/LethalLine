"use client";

import * as React from "react";

function buildTwitchPlayerSrc(channel: string, parent: string) {
  const url = new URL("https://player.twitch.tv/");
  url.searchParams.set("channel", channel);
  url.searchParams.set("parent", parent);
  url.searchParams.set("autoplay", "false");
  url.searchParams.set("muted", "true");
  return url.toString();
}

export default function TwitchLiveBlock({
  channel,
  title = "Сейчас в эфире на Twitch",
}: {
  channel: string;
  title?: string;
}) {
  const [parent, setParent] = React.useState<string | null>(null);

  React.useEffect(() => {
    setParent(window.location.hostname);
  }, []);

  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-5xl">
        <div className="relative overflow-hidden rounded-2xl bg-black shadow-[0_18px_60px_rgba(0,0,0,0.65)]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/35 to-black/70" />
          <div className="pointer-events-none absolute -inset-20 bg-[radial-gradient(circle_at_35%_25%,rgba(20,255,236,0.18),transparent_55%)]" />

          <div className="relative aspect-video w-full">
            {parent ? (
              <iframe
                className="absolute inset-0 h-full w-full opacity-90"
                src={buildTwitchPlayerSrc(channel, parent)}
                allowFullScreen
                loading="lazy"
                referrerPolicy="origin-when-cross-origin"
                title={`Twitch stream ${channel}`}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <p className="text-sm text-zinc-400">Загрузка плеера…</p>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#14ffec] to-transparent opacity-50" />
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_20%,transparent_80%,rgba(255,255,255,0.03))]" />
            </div>

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-300/80">Live</p>
                  <h2 className="mt-2 text-lg font-black uppercase tracking-[0.12em] text-[#14ffec] sm:text-xl">
                    {title}
                  </h2>
                </div>
                <div className="rounded-full bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-200/90 backdrop-blur">
                  twitch.tv/{channel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

