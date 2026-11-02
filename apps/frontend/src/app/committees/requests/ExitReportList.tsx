"use client";
/**
 * One committee's pending Exit Reports on the Admin queue. Reuses the
 * workspace Pending tab's item (confirm exactly as reported, or reject) and
 * refreshes the server-rendered page after a decision. The refresh removes the
 * decided item, so focus moves to the page heading and the outcome is
 * announced with the app-wide toast (a live region that outlives the refresh).
 */
import React, { startTransition, useCallback } from "react";
import { useRouter } from "next/navigation";

import type { PendingExitReport } from "~/lib/validations/committee";
import { PendingExitReportItem } from "~/app/committees/workspace/tabs/pending/PendingExitReportItem";
import {
  personName,
  type PendingDecision,
} from "~/app/committees/workspace/tabs/pending/PendingSubmissionItem";
import { toast } from "~/components/ui/use-toast";
import { REQUESTS_HEADING_ID } from "./requestsHeading";

const focusRequestsHeading = () => document.getElementById(REQUESTS_HEADING_ID);

export function ExitReportList({ reports }: { reports: PendingExitReport[] }) {
  const router = useRouter();

  // The item shows "Confirmed. / Rejected. Updating…" until the refresh lands.
  const onDecided = useCallback(
    (report: PendingExitReport, decision: PendingDecision) => {
      const kind = report.kind === "RESIGNATION" ? "resignation" : "removal";
      toast({
        description:
          decision === "accept"
            ? `Confirmed the ${kind} of ${personName(report)}.`
            : `Rejected the exit report for ${personName(report)}.`,
      });
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
          focusAfterDecision={focusRequestsHeading}
        />
      ))}
    </ul>
  );
}
