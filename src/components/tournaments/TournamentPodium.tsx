import Link from "next/link";
import ParticipantAvatar from "@/components/ui/ParticipantAvatar";
import type { PodiumResult } from "@/lib/tournamentPodium";

type Props = {
  podium: PodiumResult;
  participantAssets: Record<string, { logoUrl?: string | null }>;
  linkableUsernames: Set<string>;
};

function PodiumName({
  name,
  assets,
  linkSet,
}: {
  name: string;
  assets: Record<string, { logoUrl?: string | null }>;
  linkSet: Set<string>;
}) {
  const parts = name.split(/\s*·\s*/).map((s) => s.trim()).filter(Boolean);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {parts.map((part, i) => {
        const logo = assets[part]?.logoUrl;
        const inner = (
          <span className="inline-flex items-center gap-2">
            <ParticipantAvatar label={part} logoUrl={logo} size={28} />
            {linkSet.has(part) ? (
              <Link
                href={`/u/${encodeURIComponent(part)}`}
                className="font-semibold underline decoration-white/20 underline-offset-2 hover:decoration-white/60"
              >
                {part}
              </Link>
            ) : (
              <span className="font-semibold">{part}</span>
            )}
          </span>
        );
        return (
          <span key={`${part}-${i}`} className="inline-flex items-center">
            {inner}
            {i < parts.length - 1 ? <span className="mx-1 text-white/35">·</span> : null}
          </span>
        );
      })}
    </span>
  );
}

const rankStyles = {
  gold: {
    wrap: "border-amber-400/55 bg-gradient-to-br from-amber-500/20 via-amber-900/25 to-[#1a1508] shadow-[0_0_32px_rgba(212,175,55,0.12)]",
    badge: "bg-gradient-to-r from-amber-300 to-amber-500 text-black",
    label: "text-amber-200/90",
  },
  silver: {
    wrap: "border-zinc-400/45 bg-gradient-to-br from-zinc-300/15 via-zinc-500/10 to-[#141618] shadow-[0_0_28px_rgba(192,192,192,0.08)]",
    badge: "bg-gradient-to-r from-zinc-300 to-zinc-400 text-zinc-900",
    label: "text-zinc-300",
  },
  bronze: {
    wrap: "border-orange-700/50 bg-gradient-to-br from-orange-700/20 via-[#3d2415] to-[#120a06] shadow-[0_0_28px_rgba(205,127,50,0.1)]",
    badge: "bg-gradient-to-r from-orange-600 to-amber-800 text-amber-100",
    label: "text-orange-200/85",
  },
} as const;

export default function TournamentPodium({ podium, participantAssets, linkableUsernames }: Props) {
  const rows: Array<{ key: "gold" | "silver" | "bronze"; place: string; name: string; caption?: string }> = [
    { key: "gold", place: "1", name: podium.gold },
    { key: "silver", place: "2", name: podium.silver },
  ];
  if (podium.bronze) {
    rows.push({ key: "bronze", place: "3", name: podium.bronze, caption: podium.bronzeCaption });
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#323232] bg-[#161616] p-5 md:p-6">
      <h2 className="text-lg font-black uppercase tracking-[0.12em] text-[#14ffec]">Подиум</h2>
      <p className="mt-1 text-xs text-zinc-500">Топ-3 по итогам сетки (финал и полуфиналы верхней сетки; для round robin — по числу побед).</p>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => {
          const st = rankStyles[row.key];
          return (
            <li
              key={row.key}
              className={`flex flex-col gap-2 rounded-xl border px-4 py-3 md:flex-row md:items-center md:gap-4 ${st.wrap}`}
            >
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${st.badge}`}
              >
                {row.place}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${st.label}`}>
                  {row.key === "gold" ? "Победитель" : row.key === "silver" ? "Финалист" : "Третье место"}
                </p>
                <div className="mt-1 text-base text-zinc-50 md:text-lg">
                  <PodiumName name={row.name} assets={participantAssets} linkSet={linkableUsernames} />
                </div>
                {row.caption ? <p className="mt-1 text-[11px] text-zinc-500">{row.caption}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
