"use client";
import { useEffect, useState } from "react";

/**
 * The app header has no fixed height; measure it so the workspace can fill the
 * rest of the viewport and let its panes scroll independently.
 */
export function useHeightBelowNav(fallbackNavHeight = 64): string {
  const [navHeight, setNavHeight] = useState(fallbackNavHeight);
  useEffect(() => {
    const measure = () =>
      setNavHeight(
        document.querySelector("nav")?.getBoundingClientRect().height ??
          fallbackNavHeight,
      );
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [fallbackNavHeight]);
  return `calc(100dvh - ${navHeight}px)`;
}
