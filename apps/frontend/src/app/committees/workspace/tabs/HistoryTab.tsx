"use client";
/** History tab (plan §7.4). Stub: ticket 12 replaces this file's contents. */
import React from "react";

import type { CommitteeTabProps } from "./types";

export function HistoryTab({ detail }: CommitteeTabProps) {
  return (
    <div className="space-y-1 p-4 text-sm">
      <h3 className="font-semibold">History</h3>
      <p className="text-slate-500">
        {detail.history.events.length} recent events. The timeline is not
        available yet.
      </p>
    </div>
  );
}
