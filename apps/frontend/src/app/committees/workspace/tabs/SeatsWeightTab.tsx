"use client";
/** Seats & Weight tab (plan §7.3). Stub: ticket 11 replaces this file's contents. */
import React from "react";

import type { CommitteeTabProps } from "./types";

export function SeatsWeightTab({ detail }: CommitteeTabProps) {
  return (
    <div className="space-y-1 p-4 text-sm">
      <h3 className="font-semibold">Seats &amp; Weight</h3>
      <p className="text-slate-500">
        {detail.designationWeightSummary.seats.length} seats. The weight
        breakdown is not available yet.
      </p>
    </div>
  );
}
