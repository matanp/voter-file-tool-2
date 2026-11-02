"use client";
/**
 * One committee's pending Exit Reports on the Admin queue. Reuses the
 * workspace Pending tab's item (confirm exactly as reported, or reject) and
 * refreshes the server-rendered page after a decision.
 */
import React, { startTransition, useCallback } from "react";
import { useRouter } from "next/navigation";

import type { PendingExitReport } from "~/lib/validations/committee";
import { PendingExitReportItem } from "~/app/committees/workspace/tabs/pending/PendingExitReportItem";
import { type PendingDecision } from "~/app/committees/workspace/tabs/pending/PendingSubmissionItem";

export function ExitReportList({ reports }: { reports: PendingExitReport[] }) {
  const router = useRouter();

  // The item shows "Confirmed. / Rejected. Updating…" until the refresh lands.
  const onDecided = useCallback(
    (_report: PendingExitReport, _decision: PendingDecision) => {
      startTransition(() => {
        router.refresh();
      });
    },
    [router],
  );

  return (
    <ul className="space-y-2 text-sm" aria-label="Reported exits">
      {reports.map((report) => (
        <PendingExitReportItem
          key={`${report.membershipId}-${report.reportedAt}`}
          report={report}
          canDecide
          onDecided={onDecided}
        />
      ))}
    </ul>
  );
}
