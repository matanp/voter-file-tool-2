"use client";
/** Roster tab (plan §7.1). Stub: ticket 09 replaces this file's contents. */
import React from "react";

import type { CommitteeTabProps } from "./types";

export function RosterTab({ detail }: CommitteeTabProps) {
  return (
    <div className="space-y-1 p-4 text-sm">
      <h3 className="font-semibold">Roster</h3>
      <p className="text-slate-500">
        {detail.rows.length} roster rows. The seat table is not available yet.
      </p>
    </div>
  );
}
