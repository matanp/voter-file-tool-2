"use client";
/** Pending tab (plan §7.2). Stub: ticket 10 replaces this file's contents. */
import React from "react";

import type { CommitteeTabProps } from "./types";

export function PendingTab({ detail }: CommitteeTabProps) {
  return (
    <div className="space-y-1 p-4 text-sm">
      <h3 className="font-semibold">Pending</h3>
      <p className="text-slate-500">
        {detail.pending.length} pending submissions. Review is not available
        here yet.
      </p>
    </div>
  );
}
