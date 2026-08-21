"use client";

import { worldViewRect } from "@/lib/bracket-layout";
import type { BracketLayout, Camera } from "@/lib/bracket-types";
import { useEffect, useRef, type PointerEvent } from "react";

const MINI_W = 168;
const MINI_H = 104;
const PAD = 8;

function minimapScale(layout: BracketLayout) {
  const sx = (MINI_W - PAD * 2) / Math.max(layout.width, 1);
  const sy = (MINI_H - PAD * 2) / Math.max(layout.height, 1);
  const s = Math.min(sx, sy);
  return {
    s,
    ox: PAD + (MINI_W - PAD * 2 - layout.width * s) / 2,
    oy: PAD + (MINI_H - PAD * 2 - layout.height * s) / 2,
  };
}

export default function BracketMinimap({
  layout,
  camera,
  viewport,
  onPanToWorld,
}: {
  layout: BracketLayout;
  camera: Camera;
  viewport: { w: number; h: number };
  onPanToWorld: (x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef(minimapScale(layout));
  scaleRef.current = minimapScale(layout);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = MINI_W * dpr;
    canvas.height = MINI_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, MINI_W, MINI_H);
    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, MINI_W, MINI_H);
    ctx.strokeStyle = "rgba(20, 255, 236, 0.28)";
    ctx.strokeRect(0.5, 0.5, MINI_W - 1, MINI_H - 1);

    const { s, ox, oy } = scaleRef.current;
    for (const node of layout.nodes) {
      if (node.match.status === "LIVE") ctx.fillStyle = "#14ffec";
      else if (node.match.status === "FINISHED") ctx.fillStyle = "#0d7377";
      else ctx.fillStyle = "#323232";
      ctx.fillRect(ox + node.x * s, oy + node.y * s, Math.max(node.w * s, 1.5), Math.max(node.h * s, 1.2));
    }

    if (viewport.w > 0 && viewport.h > 0) {
      const view = worldViewRect(camera, viewport, 0);
      ctx.strokeStyle = "#14ffec";
      ctx.lineWidth = 1;
      ctx.strokeRect(ox + view.x * s, oy + view.y * s, view.w * s, view.h * s);
    }
  }, [camera, layout, viewport]);

  const worldFromEvent = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const { s, ox, oy } = scaleRef.current;
    return {
      x: (event.clientX - rect.left - ox) / s,
      y: (event.clientY - rect.top - oy) / s,
    };
  };

  return (
    <canvas
      ref={canvasRef}
      width={MINI_W}
      height={MINI_H}
      className="pointer-events-auto h-[104px] w-[168px] cursor-pointer rounded border border-[#323232] bg-[#141414]"
      aria-label="Обзор сетки"
      onPointerDown={(event) => {
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        const world = worldFromEvent(event);
        onPanToWorld(world.x, world.y);
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        event.stopPropagation();
        const world = worldFromEvent(event);
        onPanToWorld(world.x, world.y);
      }}
      style={{ width: MINI_W, height: MINI_H }}
    />
  );
}
