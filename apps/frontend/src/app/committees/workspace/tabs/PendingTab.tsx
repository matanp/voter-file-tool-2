"use client";
/**
 * Pending tab (plan §7.2): the selected committee's SUBMITTED candidates,
 * oldest first (as `detail.pending` arrives).
 *
 * - Acting Admin (`actingPermissions`, client visibility only): submitter,
 *   notes, eligibility status and warnings, and one-off accept/reject through
 *   the existing `handleRequest` endpoint, plus a link to the bulk queue at
 *   `/committees/requests` (an Admin-only page).
 * - Leaders: their jurisdiction's submissions read-only. The detail endpoint
 *   decides what they may see; this tab only hides the controls.
 *
 * After a decision, `onRefresh` refetches the detail and (wired in
 * `CommitteeWorkspace`) the grid row, keeping selection, tab and filters.
 */
import React, { useCallback, useContext, useState } from "react";
import Link from "next/link";
import { PrivilegeLevel } from "@prisma/client";

import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import type { PendingMembership } from "~/lib/validations/committee";
import {
  PendingSubmissionItem,
  personName,
  type PendingDecision,
} from "./pending/PendingSubmissionItem";
import { useMeetingOptions } from "./pending/useMeetingOptions";
import type { CommitteeTabProps } from "./types";

export function PendingTab({ detail, onRefresh }: CommitteeTabProps) {
  const { actingPermissions } = useContext(GlobalContext);
  const canDecide = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);
  const meetings = useMeetingOptions();
  const [announcement, setAnnouncement] = useState("");

  const onDecided = useCallback(
    (submission: PendingMembership, decision: PendingDecision) => {
      setAnnouncement(
        `${decision === "accept" ? "Accepted" : "Rejected"} ${personName(submission)}.`,
      );
      onRefresh();
    },
    [onRefresh],
  );

  const { pending } = detail;

  return (
    <div className="space-y-3 p-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">Pending</h3>
        {canDecide && (
          <Link href="/committees/requests" className="text-blue-700 underline dark:text-blue-400">
            Review all pending requests
          </Link>
        )}
      </div>
      {!canDecide && pending.length > 0 && (
        <p className="text-slate-600 dark:text-slate-400">
          Submissions awaiting Admin review. An Admin accepts or rejects them.
        </p>
      )}
      <p role="status" className="font-medium text-green-700 empty:hidden dark:text-green-400">
        {announcement}
      </p>
      {pending.length === 0 ? (
        <p className="text-slate-500">No pending submissions for this committee.</p>
      ) : (
        <ul className="space-y-2" aria-label="Pending submissions">
          {pending.map((submission) => (
            <PendingSubmissionItem
              key={submission.membershipId}
              submission={submission}
              canDecide={canDecide}
              meetings={meetings}
              onLoadMeetings={meetings.load}
              onDecided={onDecided}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
