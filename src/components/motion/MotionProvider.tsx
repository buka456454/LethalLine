"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/** reducedMotion="user" — framer сам гасит transform-анимации, если система просит меньше движения. */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
