"use client";
import { useSyncExternalStore } from "react";

/** Tailwind `md`: the split pane starts here; below it list and detail alternate. */
export const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
  const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
  // Environments without matchMedia (jsdom) behave as desktop.
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

/** True at `md` and up. Server render assumes desktop; layout itself is CSS-driven. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
