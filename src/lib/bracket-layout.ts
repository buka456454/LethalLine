import { getNextBracketSlot } from "@/lib/bracket-advance";
import type {
  BracketLayout,
  BracketMatch,
  Camera,
  LayoutEdge,
  LayoutLabel,
  LayoutNode,
  Rect,
} from "@/lib/bracket-types";

export const CARD_W = 256;
export const CARD_H = 92;
export const COL_GAP = 96;
export const ROW_GAP = 20;
export const BAND_GAP = 96;
export const WORLD_PAD = 56;
export const LABEL_H = 28;

const MIN_SCALE = 0.15;
const MAX_SCALE = 2.5;

export function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function roundLabel(round: number, segment: string, isLast: boolean) {
  if (segment === "FINAL" || isLast) return "Финал";
  return `Раунд ${round}`;
}

function strideForDepth(depth: number) {
  return (CARD_H + ROW_GAP) * 2 ** depth;
}

function bboxOf(nodes: LayoutNode[]): Rect {
  if (nodes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.w);
    maxY = Math.max(maxY, node.y + node.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function layoutEliminationBand(matches: BracketMatch[], originX: number, originY: number): LayoutNode[] {
  if (matches.length === 0) return [];
  const minRound = Math.min(...matches.map((m) => m.round));
  return matches.map((match) => {
    const depth = match.round - minRound;
    const x = originX + depth * (CARD_W + COL_GAP);
    const stride = strideForDepth(depth);
    const y = originY + (match.orderInRound - 1) * stride + (stride - CARD_H) / 2;
    return { id: match.id, match, x, y, w: CARD_W, h: CARD_H };
  });
}

function columnLabels(nodes: LayoutNode[], segment: string): LayoutLabel[] {
  const byRound = new Map<number, LayoutNode[]>();
  for (const node of nodes) {
    const list = byRound.get(node.match.round) ?? [];
    list.push(node);
    byRound.set(node.match.round, list);
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  const maxRound = rounds.at(-1) ?? 1;
  return rounds.map((round) => {
    const col = byRound.get(round)!;
    const minX = Math.min(...col.map((n) => n.x));
    const minY = Math.min(...col.map((n) => n.y));
    const isLast = round === maxRound && (segment === "FINAL" || col.some((n) => n.match.bracketSegment === "FINAL"));
    return {
      id: `label:${segment}:${round}`,
      text: segment === "LOWER" || segment === "UPPER"
        ? `${segment} · ${roundLabel(round, col[0]?.match.bracketSegment ?? segment, isLast)}`
        : roundLabel(round, col[0]?.match.bracketSegment ?? segment, isLast),
      x: minX,
      y: minY - LABEL_H,
    };
  });
}

function resolveNextMatch(match: BracketMatch, all: BracketMatch[]): BracketMatch | null {
  const { nextRound, nextOrder } = getNextBracketSlot(match.round, match.orderInRound);
  const candidates = all.filter((item) => item.round === nextRound && item.orderInRound === nextOrder);
  if (candidates.length === 0) return null;
  let next = candidates.find((item) => item.bracketSegment === match.bracketSegment) ?? null;
  if (!next && match.bracketSegment === "UPPER") {
    next = candidates.find((item) => item.bracketSegment === "FINAL") ?? null;
  }
  if (!next && candidates.length === 1) next = candidates[0];
  return next;
}

function buildEdges(nodes: LayoutNode[], allMatches: BracketMatch[]): LayoutEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges: LayoutEdge[] = [];
  for (const node of nodes) {
    const next = resolveNextMatch(node.match, allMatches);
    if (!next) continue;
    const target = byId.get(next.id);
    if (!target) continue;
    edges.push({
      id: `${node.id}->${target.id}`,
      fromId: node.id,
      toId: target.id,
      winner: Boolean(node.match.winnerLabel?.trim()),
      x1: node.x + node.w,
      y1: node.y + node.h / 2,
      x2: target.x,
      y2: target.y + target.h / 2,
    });
  }
  return edges;
}

function finalizeLayout(nodes: LayoutNode[], edges: LayoutEdge[], labels: LayoutLabel[]): BracketLayout {
  const box = bboxOf(nodes);
  const labelMinY = labels.reduce((min, label) => Math.min(min, label.y), box.y);
  const width = Math.max(box.x + box.w, 1) + WORLD_PAD;
  const height = Math.max(box.y + box.h - Math.min(0, labelMinY), box.y + box.h, 1) + WORLD_PAD;
  return { nodes, edges, labels, width, height };
}

function layoutRoundRobin(matches: BracketMatch[]): BracketLayout {
  const byRound = new Map<number, BracketMatch[]>();
  for (const match of matches) {
    const list = byRound.get(match.round) ?? [];
    list.push(match);
    byRound.set(match.round, list);
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  const nodes: LayoutNode[] = [];
  const labels: LayoutLabel[] = [];
  rounds.forEach((round, col) => {
    const colMatches = [...(byRound.get(round) ?? [])].sort((a, b) => a.orderInRound - b.orderInRound);
    const x = WORLD_PAD + col * (CARD_W + COL_GAP);
    labels.push({
      id: `label:RR:${round}`,
      text: `Раунд ${round}`,
      x,
      y: WORLD_PAD - LABEL_H,
    });
    colMatches.forEach((match, row) => {
      nodes.push({
        id: match.id,
        match,
        x,
        y: WORLD_PAD + row * (CARD_H + ROW_GAP),
        w: CARD_W,
        h: CARD_H,
      });
    });
  });
  return finalizeLayout(nodes, [], labels);
}

function layoutSingleElimination(matches: BracketMatch[]): BracketLayout {
  const originY = WORLD_PAD + LABEL_H;
  const nodes = layoutEliminationBand(matches, WORLD_PAD, originY);
  const hasFinal = matches.some((m) => m.bracketSegment === "FINAL");
  const labels = columnLabels(nodes, hasFinal ? "FINAL" : "UPPER");
  return finalizeLayout(nodes, buildEdges(nodes, matches), labels);
}

function layoutDoubleElimination(matches: BracketMatch[]): BracketLayout {
  const upper = matches.filter((m) => m.bracketSegment === "UPPER");
  const lower = matches.filter((m) => m.bracketSegment === "LOWER");
  const finals = matches.filter((m) => m.bracketSegment === "FINAL");
  const originY = WORLD_PAD + LABEL_H;
  const upperNodes = layoutEliminationBand(upper, WORLD_PAD, originY);
  const upperBox = bboxOf(upperNodes);
  const lowerOriginY = (upperNodes.length ? upperBox.y + upperBox.h : originY) + BAND_GAP + LABEL_H;
  const lowerNodes = layoutEliminationBand(lower, WORLD_PAD, lowerOriginY);
  const treeNodes = [...upperNodes, ...lowerNodes];
  const treeBox = bboxOf(treeNodes);
  const finalX = (treeNodes.length ? treeBox.x + treeBox.w : WORLD_PAD) + COL_GAP;
  const midY =
    treeNodes.length > 0
      ? treeBox.y + treeBox.h / 2 - CARD_H / 2
      : originY;
  const finalNodes: LayoutNode[] = finals.map((match, index) => ({
    id: match.id,
    match,
    x: finalX,
    y: midY + index * (CARD_H + ROW_GAP),
    w: CARD_W,
    h: CARD_H,
  }));
  const nodes = [...treeNodes, ...finalNodes];
  const labels = [
    ...columnLabels(upperNodes, "UPPER"),
    ...columnLabels(lowerNodes, "LOWER"),
    ...columnLabels(finalNodes, "FINAL"),
  ];
  return finalizeLayout(nodes, buildEdges(nodes, matches), labels);
}

export function layoutBracket(
  matches: BracketMatch[],
  format: "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION" | "ROUND_ROBIN" | string,
): BracketLayout {
  if (matches.length === 0) {
    return { nodes: [], edges: [], labels: [], width: CARD_W + WORLD_PAD * 2, height: CARD_H + WORLD_PAD * 2 };
  }
  if (format === "ROUND_ROBIN") return layoutRoundRobin(matches);
  if (format === "DOUBLE_ELIMINATION") return layoutDoubleElimination(matches);
  return layoutSingleElimination(matches);
}

export function rectsIntersect(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function worldViewRect(camera: Camera, viewport: { w: number; h: number }, bufferPx = 180): Rect {
  const scale = camera.scale || 1;
  const buf = bufferPx / scale;
  return {
    x: -camera.x / scale - buf,
    y: -camera.y / scale - buf,
    w: viewport.w / scale + buf * 2,
    h: viewport.h / scale + buf * 2,
  };
}

export function cullNodes(nodes: LayoutNode[], view: Rect) {
  return nodes.filter((node) => rectsIntersect({ x: node.x, y: node.y, w: node.w, h: node.h }, view));
}

export function cullEdges(edges: LayoutEdge[], view: Rect) {
  return edges.filter((edge) =>
    rectsIntersect(
      {
        x: Math.min(edge.x1, edge.x2),
        y: Math.min(edge.y1, edge.y2),
        w: Math.max(Math.abs(edge.x2 - edge.x1), 1),
        h: Math.max(Math.abs(edge.y2 - edge.y1), 1),
      },
      view,
    ),
  );
}

export function cullLabels(labels: LayoutLabel[], view: Rect) {
  return labels.filter((label) => rectsIntersect({ x: label.x, y: label.y, w: CARD_W, h: LABEL_H }, view));
}

export function fitCamera(
  layout: Pick<BracketLayout, "width" | "height">,
  viewport: { w: number; h: number },
  padding = 32,
): Camera {
  if (viewport.w < 8 || viewport.h < 8 || layout.width < 1 || layout.height < 1) {
    return { x: 0, y: 0, scale: 1 };
  }
  const scale = clampScale(
    Math.min((viewport.w - padding * 2) / layout.width, (viewport.h - padding * 2) / layout.height),
  );
  return {
    x: (viewport.w - layout.width * scale) / 2,
    y: (viewport.h - layout.height * scale) / 2,
    scale,
  };
}

export function zoomCameraAt(camera: Camera, screen: { x: number; y: number }, factor: number): Camera {
  const scale = clampScale(camera.scale * factor);
  const worldX = (screen.x - camera.x) / camera.scale;
  const worldY = (screen.y - camera.y) / camera.scale;
  return {
    scale,
    x: screen.x - worldX * scale,
    y: screen.y - worldY * scale,
  };
}

export function panCamera(camera: Camera, dx: number, dy: number): Camera {
  return { ...camera, x: camera.x + dx, y: camera.y + dy };
}

export function centerCameraOn(
  camera: Camera,
  node: Pick<LayoutNode, "x" | "y" | "w" | "h">,
  viewport: { w: number; h: number },
): Camera {
  const nx = node.x + node.w / 2;
  const ny = node.y + node.h / 2;
  return {
    scale: camera.scale,
    x: viewport.w / 2 - nx * camera.scale,
    y: viewport.h / 2 - ny * camera.scale,
  };
}

export function edgePath(edge: LayoutEdge) {
  const dx = Math.max(28, (edge.x2 - edge.x1) / 2);
  return `M ${edge.x1} ${edge.y1} C ${edge.x1 + dx} ${edge.y1}, ${edge.x2 - dx} ${edge.y2}, ${edge.x2} ${edge.y2}`;
}
