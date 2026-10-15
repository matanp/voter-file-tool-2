"use client";
/**
 * PROTOTYPE — floating bottom bar for the `?variant=` throwaway variants.
 * Hidden in production builds. Delete with the rest of `_prototype/`.
 */
import React, { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export const VARIANTS: Array<{ key: string; name: string }> = [
  { key: "A", name: "Split pane" },
  { key: "B", name: "Full-width index + detail" },
  { key: "C", name: "Dashboard + expanding detail" },
];

export function PrototypeSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const go = (delta: number) => {
    const i = VARIANTS.findIndex((v) => v.key === current);
    const next = VARIANTS[(i + delta + VARIANTS.length) % VARIANTS.length]!;
    const p = new URLSearchParams(searchParams?.toString());
    p.set("variant", next.key);
    router.replace(`${pathname}?${p.toString()}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;
  const v = VARIANTS.find((x) => x.key === current);

  return (
    <div className="fixed bottom-3 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1 rounded-full border-2 border-amber-400 bg-black/90 px-2 py-1 text-xs font-mono text-amber-200 shadow-xl">
      <button onClick={() => go(-1)} className="rounded-full p-1 hover:bg-white/10" aria-label="Previous variant">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="px-1">
        PROTOTYPE · {current}
        {v ? ` (${v.name})` : " (unknown)"} · {VARIANTS.length === 1 ? "only variant built" : `${VARIANTS.length} variants`}
      </span>
      <button onClick={() => go(1)} className="rounded-full p-1 hover:bg-white/10" aria-label="Next variant">
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        onClick={() => router.replace(pathname ?? "/committees")}
        className="ml-1 rounded-full p-1 hover:bg-white/10"
        aria-label="Exit prototype"
        title="Back to the real page"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
