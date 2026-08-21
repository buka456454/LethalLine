"use client";

import { CARD_W, cullEdges, cullLabels, cullNodes, edgePath, worldViewRect } from "@/lib/bracket-layout";
import type { BracketLayout, Camera, LayoutNode } from "@/lib/bracket-types";
import { cn } from "@/lib/cn";
import type { ReactNode, Ref } from "react";

/**
 * Кастомный CSS-transform + virtualized DOM, не @xyflow/react:
 * ноды не драгаются — это камера над статическим деревом, не graph editor.
 * Lethal Line (#141414 / #212121 / #14ffec, ll-frame--brackets) без борьбы с CSS React Flow.
 * 1000 команд ≈ 1023 матча; координаты O(n), в DOM только viewport + buffer.
 * Framer Motion — появление нод, accordion, LIVE. Камера — нативный transform, не Motion.
 */
export default function BracketCanvas({
  layout,
  camera,
  viewportRef,
  viewport,
  expandedMatchId,
  renderCard,
  children,
}: {
  layout: BracketLayout;
  camera: Camera;
  viewportRef: Ref<HTMLDivElement | null>;
  viewport: { w: number; h: number };
  expandedMatchId: string | null;
  renderCard: (node: LayoutNode) => ReactNode;
  children?: ReactNode;
}) {
  const view =
    viewport.w < 8 || viewport.h < 8
      ? { x: 0, y: 0, w: Math.max(layout.width, 1), h: Math.max(layout.height, 1) }
      : worldViewRect(camera, viewport);
  const nodes = cullNodes(layout.nodes, view);
  const edges = cullEdges(layout.edges, view);
  const labels = cullLabels(layout.labels, view);
  const restEdges = edges.filter((edge) => !edge.winner);
  const winnerEdges = edges.filter((edge) => edge.winner);

  return (
    <div
      ref={viewportRef}
      className="relative z-10 h-[min(72dvh,720px)] cursor-grab overflow-hidden bg-[#141414] active:cursor-grabbing md:h-[min(75vh,760px)]"
      style={{ touchAction: "none", overscrollBehavior: "none" }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
          width: layout.width,
          height: layout.height,
        }}
      >
        <svg
          width={layout.width}
          height={layout.height}
          className="pointer-events-none absolute left-0 top-0"
          aria-hidden
        >
          {restEdges.map((edge) => (
            <path key={edge.id} d={edgePath(edge)} fill="none" stroke="#323232" strokeWidth={2} />
          ))}
          {winnerEdges.map((edge) => (
            <path key={edge.id} d={edgePath(edge)} fill="none" stroke="#14ffec" strokeWidth={2.25} />
          ))}
        </svg>
        {labels.map((label) => (
          <div
            key={label.id}
            className="pointer-events-none absolute text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500"
            style={{ left: label.x, top: label.y, width: CARD_W }}
          >
            {label.text}
          </div>
        ))}
        {nodes.map((node) => (
          <div
            key={node.id}
            className={cn("absolute", expandedMatchId === node.id && "z-20")}
            style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
          >
            {renderCard(node)}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
