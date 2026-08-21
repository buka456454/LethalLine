"use client";

import BracketCanvas from "@/components/bracket/BracketCanvas";
import BracketInspector from "@/components/bracket/BracketInspector";
import BracketMatchCard from "@/components/bracket/BracketMatchCard";
import BracketMinimap from "@/components/bracket/BracketMinimap";
import { useBracketCamera } from "@/components/bracket/useBracketCamera";
import { layoutBracket } from "@/lib/bracket-layout";
import type { BracketMatch, BracketMatchStatus, ParticipantRoster } from "@/lib/bracket-types";
import { TournamentFormat } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  format: TournamentFormat;
  matches: BracketMatch[];
  canEdit?: boolean;
  rosters?: Record<string, ParticipantRoster>;
};

function nodeMatchesQuery(match: BracketMatch, query: string, rosters: Record<string, ParticipantRoster>) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const labels = [match.participantA, match.participantB];
  if (labels.some((label) => label?.toLowerCase().includes(q))) return true;
  for (const label of labels) {
    const roster = label ? rosters[label] : undefined;
    if (roster?.members.some((member) => member.username.toLowerCase().includes(q))) return true;
  }
  return false;
}

export default function TournamentBracket({ format, matches, canEdit = false, rosters = {} }: Props) {
  const router = useRouter();
  const layout = useMemo(() => layoutBracket(matches, format), [format, matches]);
  const {
    viewportRef,
    camera,
    viewport,
    zoomBy,
    zoomToPercent,
    fit,
    centerOn,
    panToWorld,
    shouldIgnoreClick,
  } = useBracketCamera(layout);
  const seenIdsRef = useRef(new Set<string>());
  const nodesRef = useRef(layout.nodes);
  nodesRef.current = layout.nodes;
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<{ matchId: string; side: "A" | "B" } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const highlightedIds = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return new Set<string>();
    return new Set(layout.nodes.filter((node) => nodeMatchesQuery(node.match, q, rosters)).map((node) => node.id));
  }, [layout.nodes, query, rosters]);
  const firstHitId = useMemo(() => {
    if (query.trim().length < 2) return null;
    return layout.nodes.find((node) => highlightedIds.has(node.id))?.id ?? null;
  }, [highlightedIds, layout.nodes, query]);

  useEffect(() => {
    if (!firstHitId) return;
    const timer = window.setTimeout(() => {
      const node = nodesRef.current.find((item) => item.id === firstHitId);
      if (node) centerOn(node);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [centerOn, firstHitId]);

  const selectedMatch = matches.find((match) => match.id === selectedId) ?? null;
  const zoomPct = Math.round(camera.scale * 100);

  const saveMatch = async (payload: {
    scoreA: number;
    scoreB: number;
    status: BracketMatchStatus;
    winnerLabel?: string;
  }) => {
    if (!selectedMatch) return;
    setBusy(true);
    setSaveError(null);
    const response = await fetch(`/api/admin/matches/${selectedMatch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setSaveError(json.error ?? "Не удалось сохранить матч");
      return;
    }
    router.refresh();
  };

  return (
    <section className="ll-frame ll-frame--brackets mt-6 overflow-hidden bg-[#212121] p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-300">Сетка турнира</h2>
          <span className="rounded bg-[#323232] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[#14ffec]">
            {format}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input-base h-9 min-w-[12rem] flex-1 py-1 text-sm sm:max-w-xs"
            placeholder="Найти команду или игрока"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const node = layout.nodes.find((item) => highlightedIds.has(item.id));
              if (node) centerOn(node);
            }}
            aria-label="Поиск по сетке"
          />
          <div className="flex items-center gap-1">
            <button type="button" className="button-secondary px-2 py-1 text-xs" onClick={() => zoomBy(0.9)} aria-label="Уменьшить">
              −
            </button>
            <button type="button" className="button-secondary px-2 py-1 text-xs tabular-nums" onClick={zoomToPercent} aria-label="Масштаб 100 процентов">
              {zoomPct}%
            </button>
            <button type="button" className="button-secondary px-2 py-1 text-xs" onClick={() => zoomBy(1.1)} aria-label="Увеличить">
              +
            </button>
            <button type="button" className="button-secondary px-2 py-1 text-xs uppercase tracking-wider" onClick={fit}>
              Fit
            </button>
          </div>
        </div>
      </div>

      {layout.nodes.length === 0 ? (
        <p className="px-2 py-10 text-center text-sm text-zinc-500">Сетка пока пуста.</p>
      ) : (
        <div className="relative">
          <BracketCanvas
            layout={layout}
            camera={camera}
            viewportRef={viewportRef}
            viewport={viewport}
            expandedMatchId={expanded?.matchId ?? null}
            renderCard={(node) => {
              const appear = !seenIdsRef.current.has(node.id);
              if (appear) seenIdsRef.current.add(node.id);
              return (
                <BracketMatchCard
                  match={node.match}
                  rosterA={node.match.participantA ? rosters[node.match.participantA] : undefined}
                  rosterB={node.match.participantB ? rosters[node.match.participantB] : undefined}
                  highlighted={highlightedIds.has(node.id)}
                  selected={selectedId === node.id}
                  expandedSide={expanded?.matchId === node.id ? expanded.side : null}
                  appear={appear}
                  onToggleSide={(side) => {
                    if (shouldIgnoreClick()) return;
                    setExpanded((prev) =>
                      prev?.matchId === node.id && prev.side === side ? null : { matchId: node.id, side },
                    );
                  }}
                  onSelect={() => {
                    if (shouldIgnoreClick()) return;
                    if (!canEdit) return;
                    setSelectedId(node.id);
                    setSaveError(null);
                  }}
                />
              );
            }}
          >
            <div className="pointer-events-none absolute bottom-3 left-3 z-20">
              <div className="pointer-events-auto">
                <BracketMinimap
                  layout={layout}
                  camera={camera}
                  viewport={viewport}
                  onPanToWorld={panToWorld}
                />
              </div>
            </div>
          </BracketCanvas>
          {canEdit && selectedMatch ? (
            <BracketInspector
              match={selectedMatch}
              busy={busy}
              error={saveError}
              onClose={() => setSelectedId(null)}
              onSave={(payload) => void saveMatch(payload)}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
