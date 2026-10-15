"use client";
import React from "react";
import { AlertTriangle, Clock } from "lucide-react";

import type { CommitteeDetailResponse } from "~/lib/validations/committee";
import { openSeats } from "./gridModel";

export type CommitteeSummaryProps = {
  rollup: CommitteeDetailResponse["rollup"];
  /** `committee.ltedWeight`: Decimal as a string, null until known. */
  ltedWeight: string | null;
};

/**
 * One-line status for the selected committee. Every state is spelled out in
 * text (plan §10: never color alone).
 */
export function CommitteeSummary({ rollup, ltedWeight }: CommitteeSummaryProps) {
  const open = openSeats(rollup);
  const missing = rollup.missingWeightSeatNumbers;
  return (
    <ul
      aria-label="Committee summary"
      className="flex flex-wrap gap-x-3 gap-y-1 px-4 pb-2 pt-1 text-sm text-slate-600 dark:text-slate-300"
    >
      <li>
        {rollup.filled} of {rollup.totalSeats} seats filled
        {open === 0 ? " (full)" : ` · ${open} open`}
      </li>
      {rollup.unassignedCount > 0 && <li>{rollup.unassignedCount} unassigned</li>}
      {rollup.pendingCount > 0 && (
        <li className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {rollup.pendingCount} pending
        </li>
      )}
      <li>{ltedWeight ? `LTED weight ${ltedWeight}` : "LTED weight not set"}</li>
      {missing.length > 0 && (
        <li className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Missing weight: seat{missing.length > 1 ? "s" : ""} {missing.join(", ")}
        </li>
      )}
    </ul>
  );
}
