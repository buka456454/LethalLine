"use client";

import {
  clampScale,
  centerCameraOn,
  fitCamera,
  panCamera,
  zoomCameraAt,
} from "@/lib/bracket-layout";
import type { BracketLayout, Camera, LayoutNode } from "@/lib/bracket-types";
import { useCallback, useEffect, useRef, useState, type RefCallback } from "react";

const DRAG_THRESHOLD = 5;

export function useBracketCamera(layout: BracketLayout) {
  const cameraRef = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const viewportSizeRef = useRef({ w: 0, h: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; midX: number; midY: number } | null>(null);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const didFitRef = useRef(false);
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);

  const viewportRef = useCallback<RefCallback<HTMLDivElement>>((node) => {
    setViewportEl(node);
  }, []);

  const [camera, setCameraState] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const setCamera = useCallback((next: Camera | ((prev: Camera) => Camera)) => {
    setCameraState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      cameraRef.current = value;
      return value;
    });
  }, []);

  useEffect(() => {
    if (!viewportEl) return;
    const update = () => {
      const rect = viewportEl.getBoundingClientRect();
      const size = { w: rect.width, h: rect.height };
      viewportSizeRef.current = size;
      setViewport(size);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewportEl);
    return () => observer.disconnect();
  }, [viewportEl]);

  useEffect(() => {
    if (didFitRef.current) return;
    if (viewport.w < 8 || viewport.h < 8 || layout.nodes.length === 0) return;
    const fitted = fitCamera(layout, viewport);
    didFitRef.current = true;
    setCamera(fitted);
  }, [layout, setCamera, viewport]);

  const localPoint = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const rect = viewportEl?.getBoundingClientRect();
      if (!rect) return { x: event.clientX, y: event.clientY };
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    },
    [viewportEl],
  );

  useEffect(() => {
    if (!viewportEl) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = localPoint(event);
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      setCamera((prev) => zoomCameraAt(prev, point, factor));
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      if ((event.target as HTMLElement | null)?.closest("canvas")) return;
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      movedRef.current = false;
      if (pointersRef.current.size === 1) {
        dragOriginRef.current = { x: event.clientX, y: event.clientY };
      } else if (pointersRef.current.size === 2) {
        const pts = [...pointersRef.current.values()];
        const dx = pts[0]!.x - pts[1]!.x;
        const dy = pts[0]!.y - pts[1]!.y;
        pinchRef.current = {
          distance: Math.hypot(dx, dy),
          midX: (pts[0]!.x + pts[1]!.x) / 2,
          midY: (pts[0]!.y + pts[1]!.y) / 2,
        };
        dragOriginRef.current = null;
        viewportEl.setPointerCapture(event.pointerId);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const prevPoint = pointersRef.current.get(event.pointerId);
      if (!prevPoint) return;
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const moveX = event.clientX - prevPoint.x;
      const moveY = event.clientY - prevPoint.y;

      if (pointersRef.current.size === 2 && pinchRef.current) {
        const pts = [...pointersRef.current.values()];
        const dx = pts[0]!.x - pts[1]!.x;
        const dy = pts[0]!.y - pts[1]!.y;
        const distance = Math.hypot(dx, dy) || 1;
        const mid = { x: (pts[0]!.x + pts[1]!.x) / 2, y: (pts[0]!.y + pts[1]!.y) / 2 };
        const prev = pinchRef.current;
        const factor = distance / (prev.distance || distance);
        const localMid = localPoint({ clientX: mid.x, clientY: mid.y });
        setCamera((cam) => {
          const zoomed = zoomCameraAt(cam, localMid, factor);
          return panCamera(zoomed, mid.x - prev.midX, mid.y - prev.midY);
        });
        pinchRef.current = { distance, midX: mid.x, midY: mid.y };
        movedRef.current = true;
        return;
      }

      if (pointersRef.current.size === 1 && dragOriginRef.current) {
        const dx = event.clientX - dragOriginRef.current.x;
        const dy = event.clientY - dragOriginRef.current.y;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          if (!movedRef.current) viewportEl.setPointerCapture(event.pointerId);
          movedRef.current = true;
        }
        if (movedRef.current) setCamera((cam) => panCamera(cam, moveX, moveY));
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size < 2) pinchRef.current = null;
      if (pointersRef.current.size === 0) dragOriginRef.current = null;
    };

    viewportEl.addEventListener("wheel", onWheel, { passive: false });
    viewportEl.addEventListener("pointerdown", onPointerDown);
    viewportEl.addEventListener("pointermove", onPointerMove);
    viewportEl.addEventListener("pointerup", onPointerUp);
    viewportEl.addEventListener("pointercancel", onPointerUp);
    viewportEl.addEventListener("lostpointercapture", onPointerUp);
    return () => {
      viewportEl.removeEventListener("wheel", onWheel);
      viewportEl.removeEventListener("pointerdown", onPointerDown);
      viewportEl.removeEventListener("pointermove", onPointerMove);
      viewportEl.removeEventListener("pointerup", onPointerUp);
      viewportEl.removeEventListener("pointercancel", onPointerUp);
      viewportEl.removeEventListener("lostpointercapture", onPointerUp);
    };
  }, [localPoint, setCamera, viewportEl]);

  const zoomBy = useCallback(
    (factor: number) => {
      const size = viewportSizeRef.current;
      setCamera((prev) => zoomCameraAt(prev, { x: size.w / 2, y: size.h / 2 }, factor));
    },
    [setCamera],
  );

  const zoomToPercent = useCallback(() => {
    const size = viewportSizeRef.current;
    setCamera((prev) => zoomCameraAt(prev, { x: size.w / 2, y: size.h / 2 }, clampScale(1) / prev.scale));
  }, [setCamera]);

  const fit = useCallback(() => {
    setCamera(fitCamera(layout, viewportSizeRef.current));
  }, [layout, setCamera]);

  const centerOn = useCallback(
    (node: Pick<LayoutNode, "x" | "y" | "w" | "h">) => {
      setCamera((prev) => centerCameraOn(prev, node, viewportSizeRef.current));
    },
    [setCamera],
  );

  const panToWorld = useCallback(
    (worldX: number, worldY: number) => {
      const size = viewportSizeRef.current;
      setCamera((prev) => ({
        scale: prev.scale,
        x: size.w / 2 - worldX * prev.scale,
        y: size.h / 2 - worldY * prev.scale,
      }));
    },
    [setCamera],
  );

  const shouldIgnoreClick = useCallback(() => movedRef.current, []);

  return {
    viewportRef,
    camera,
    viewport,
    zoomBy,
    zoomToPercent,
    fit,
    centerOn,
    panToWorld,
    shouldIgnoreClick,
  };
}
