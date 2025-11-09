"use client";

import React from "react";

const MAX_SHIFT = 140;
const MIN_SHIFT = 72; // ignore small differences (safe-area / standalone)

export const isStandaloneDisplayMode = () => {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)")?.matches) return true;
  } catch {
    /* no-op */
  }
  const nav = window.navigator as { standalone?: boolean };
  return nav?.standalone === true;
};

const readViewportBottomShift = () => {
  if (typeof window === "undefined") return 0;
  if (isStandaloneDisplayMode()) return 0;
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  const layoutHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  if (!layoutHeight || !viewport.height) return 0;

  const viewportBottom = (viewport.offsetTop ?? 0) + viewport.height;
  const extra = viewportBottom - layoutHeight;
  if (extra <= MIN_SHIFT) return 0;
  return Math.min(extra, MAX_SHIFT);
};

export function useVisualViewportBottomOffset() {
  const [offset, setOffset] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => setOffset(readViewportBottomShift());

    update();

    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return offset;
}
