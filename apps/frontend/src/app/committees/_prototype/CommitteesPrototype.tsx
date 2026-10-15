"use client";
/**
 * PROTOTYPE — ticket 01 (.scratch/committees-workspace/issues/01). Layout variants
 * of the Committee Operations Workspace on the existing `/committees` route,
 * mounted only in development when `?variant=` is present. Everything under
 * `_prototype/` is throwaway: it is captured on a branch and deleted from
 * main once the layout decision is recorded.
 */
import React, { Suspense } from "react";
import { PrototypeSwitcher, VARIANTS } from "./PrototypeSwitcher";
import { VariantA } from "./VariantA";
import { VariantB } from "./VariantB";
import { VariantC } from "./VariantC";

export function CommitteesPrototype({ variant }: { variant: string }) {
  const known = VARIANTS.some((v) => v.key === variant);
  return (
    <Suspense fallback={null}>
      {variant === "A" && <VariantA />}
      {variant === "B" && <VariantB />}
      {variant === "C" && <VariantC />}
      {!known && (
        <div className="p-8 text-sm text-slate-500">
          No variant “{variant}”. Built: {VARIANTS.map((v) => `${v.key} (${v.name})`).join(", ")}.
        </div>
      )}
      <PrototypeSwitcher current={variant} />
    </Suspense>
  );
}
