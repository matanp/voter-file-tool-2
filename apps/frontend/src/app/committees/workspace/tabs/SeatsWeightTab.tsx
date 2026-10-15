"use client";
/**
 * Seats & Weight tab (plan §7.3): every seat and weight concern for the
 * selected committee in one place.
 *
 * - Everyone in scope: the seat summary (filled, open, unassigned), the LTED
 *   weight, the designation-weight total, and missing-weight warnings, all
 *   spelled out in text (plan §10).
 * - Acting Admin (`actingPermissions`, client visibility only): the LTED
 *   total-weight editor and the per-seat breakdown. What a Leader sees is
 *   decided in `seats/seatsWeightDisplay.ts` (`seatsWeightVisibility`).
 *
 * All numbers come from the detail response (the server's rollup and
 * designation-weight engine). After a weight save, `onRefresh` refetches the
 * detail and the grid row.
 */
import React, { useCallback, useContext, useId, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { GlobalContext } from "~/components/providers/GlobalContext";
import { openSeats } from "../gridModel";
import { LtedWeightEditor } from "./seats/LtedWeightEditor";
import { SeatWeightBreakdown } from "./seats/SeatWeightBreakdown";
import {
  formatDesignationWeight,
  missingWeightWarning,
  seatsWeightVisibility,
} from "./seats/seatsWeightDisplay";
import type { CommitteeTabProps } from "./types";

export function SeatsWeightTab({ detail, onRefresh }: CommitteeTabProps) {
  const { actingPermissions } = useContext(GlobalContext);
  const { canEditLtedWeight, showSeatBreakdown } = seatsWeightVisibility(actingPermissions);
  const [announcement, setAnnouncement] = useState("");
  const breakdownHeadingId = useId();

  const onSaved = useCallback(
    (value: number | null) => {
      setAnnouncement(value === null ? "LTED weight cleared." : "LTED weight saved.");
      onRefresh();
    },
    [onRefresh],
  );

  const { committee, rollup } = detail;
  const open = openSeats(rollup);
  const warning = missingWeightWarning(rollup.missingWeightSeatNumbers);

  return (
    <div className="space-y-4 p-4 text-sm">
      <h3 className="font-semibold">Seats &amp; Weight</h3>

      <ul aria-label="Seat and weight summary" className="space-y-1">
        <li>
          {rollup.filled} of {rollup.totalSeats} seats filled
          {open === 0 ? " (full)" : ` · ${open} open`}
        </li>
        {rollup.unassignedCount > 0 && (
          <li>
            {rollup.unassignedCount} unassigned member
            {rollup.unassignedCount === 1 ? "" : "s"} (no seat)
          </li>
        )}
        <li>
          <span className="text-slate-600 dark:text-slate-400">LTED weight</span>{" "}
          <span className="font-medium">{committee.ltedWeight ?? "Not set"}</span>
        </li>
        <li>
          <span className="text-slate-600 dark:text-slate-400">Designation weight</span>{" "}
          <span className="font-medium">{formatDesignationWeight(rollup)}</span>
        </li>
      </ul>

      {warning && (
        <p className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{warning}</span>
        </p>
      )}

      <p role="status" className="font-medium text-green-700 empty:hidden dark:text-green-400">
        {announcement}
      </p>

      {canEditLtedWeight && (
        <LtedWeightEditor
          key={committee.ltedWeight ?? ""}
          committeeListId={committee.committeeListId}
          ltedWeight={committee.ltedWeight}
          maxSeatsPerLted={detail.maxSeatsPerLted}
          onSaved={onSaved}
        />
      )}

      {showSeatBreakdown && (
        <section aria-labelledby={breakdownHeadingId} className="space-y-2">
          <h4 id={breakdownHeadingId} className="font-medium">
            Designation weight by seat
          </h4>
          <SeatWeightBreakdown summary={detail.designationWeightSummary} />
        </section>
      )}
    </div>
  );
}
