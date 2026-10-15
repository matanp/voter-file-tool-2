"use client";
/**
 * One submission in the Pending tab. Everyone in scope sees the candidate, the
 * submitted date, and whom they would replace. With `canDecide` (acting Admin)
 * it also shows the Admin-only context the detail carries (submitter, notes,
 * eligibility warnings) and the accept/reject controls.
 *
 * Accept and reject call the existing `POST /api/committee/handleRequest`,
 * exactly as `/committees/requests` and Meetings do: reject needs only the
 * membership id; accept needs the meeting record it was decided at, and the
 * server re-runs eligibility (hard stops come back as `INELIGIBLE` + reasons).
 */
import React, { useId, useState } from "react";
import Link from "next/link";
import type { SimpleApiResponse } from "@voter-file-tool/shared-validators";

import { Button } from "~/components/ui/button";
import { useApiMutation } from "~/hooks/useApiMutation";
import { formatCalendarDateForDisplay } from "~/lib/dateUtils";
import { getIneligibilityMessages } from "~/lib/eligibilityMessages";
import type { PendingMembership } from "~/lib/validations/committee";
import type { MeetingOptionsState } from "./useMeetingOptions";

export type PendingDecision = "accept" | "reject";

type HandleRequestPayload = {
  membershipId: string;
  acceptOrReject: PendingDecision;
  meetingRecordId?: string;
};

type ApiError = Error & {
  apiErrorBody?: { error?: string; reasons?: string[] };
};

export type PendingSubmissionItemProps = {
  submission: PendingMembership;
  /** Acting Admin: show Admin-only context and the accept/reject controls. */
  canDecide: boolean;
  meetings: MeetingOptionsState;
  onLoadMeetings: () => void;
  /** Called after the server accepted the decision. */
  onDecided: (submission: PendingMembership, decision: PendingDecision) => void;
};

export function personName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`.trim() || "Unnamed voter";
}

/** `eligibilityWarnings` entries are untyped snapshots; show their message. */
function warningText(warning: unknown): string {
  if (warning && typeof warning === "object") {
    const w = warning as { message?: unknown; code?: unknown };
    if (typeof w.message === "string") return w.message;
    if (typeof w.code === "string") return w.code;
  }
  return typeof warning === "string" ? warning : "Unrecognized warning";
}

function decisionError(err: ApiError, decision: PendingDecision): string {
  const body = err.apiErrorBody;
  if (body?.error === "INELIGIBLE") {
    return `Cannot accept: ${getIneligibilityMessages(body.reasons).join(" ")}`;
  }
  return `Could not ${decision}: ${err.message || "Something went wrong."}`;
}

function submittedByText(s: PendingMembership, canDecide: boolean): string {
  if (canDecide && s.submittedBy) {
    return ` by ${s.isOwnSubmission ? "you" : (s.submittedBy.name ?? "an unnamed user")}`;
  }
  return s.isOwnSubmission ? " by you" : "";
}

export function PendingSubmissionItem({
  submission,
  canDecide,
  meetings,
  onLoadMeetings,
  onDecided,
}: PendingSubmissionItemProps) {
  const name = personName(submission);
  const ids = useId();
  const [accepting, setAccepting] = useState(false);
  const [meetingId, setMeetingId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState<PendingDecision | null>(null);
  /** Set once the server took the decision; the refreshed detail drops the item. */
  const [decided, setDecided] = useState<PendingDecision | null>(null);

  const mutation = useApiMutation<SimpleApiResponse, HandleRequestPayload>(
    "/api/committee/handleRequest",
    "POST",
  );

  const decide = async (decision: PendingDecision) => {
    setError(null);
    setInFlight(decision);
    try {
      await mutation.mutate({
        membershipId: submission.membershipId,
        acceptOrReject: decision,
        ...(decision === "accept" ? { meetingRecordId: meetingId } : {}),
      });
      setDecided(decision);
      onDecided(submission, decision);
    } catch (err) {
      setError(decisionError(err as ApiError, decision));
    } finally {
      setInFlight(null);
    }
  };

  const openAccept = () => {
    setError(null);
    setAccepting(true);
    onLoadMeetings();
  };

  const busy = inFlight !== null || decided !== null;
  const warnings = submission.eligibilityWarnings ?? [];
  const meetingSelectId = `${ids}-meeting`;

  return (
    <li
      className="space-y-2 rounded-md border p-3"
      aria-labelledby={`${ids}-name`}
      aria-busy={busy}
    >
      <div>
        <p id={`${ids}-name`} className="font-medium">
          {name}{" "}
          <span className="font-normal text-slate-500">
            · VRCNUM {submission.voterRecordId}
          </span>
        </p>
        <p className="text-slate-600 dark:text-slate-400">
          Submitted {formatCalendarDateForDisplay(submission.submittedAt)}
          {submittedByText(submission, canDecide)}
        </p>
        {submission.replacementFor && (
          <p className="text-slate-600 dark:text-slate-400">
            Replaces {personName(submission.replacementFor)}
          </p>
        )}
      </div>

      {canDecide && submission.requestNotes && (
        <p>
          <span className="font-medium">Notes:</span> {submission.requestNotes}
        </p>
      )}

      {canDecide &&
        (warnings.length > 0 ? (
          <div className="rounded border border-amber-300 bg-amber-50 p-2 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            <p className="font-medium">
              Eligibility: {warnings.length}{" "}
              {warnings.length === 1 ? "warning" : "warnings"} at submission
            </p>
            <ul className="mt-1 list-inside list-disc">
              {warnings.map((w, i) => (
                <li key={i}>{warningText(w)}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-slate-600 dark:text-slate-400">
            Eligibility: no warnings at submission
          </p>
        ))}

      {canDecide && decided && (
        <p className="font-medium">
          {decided === "accept" ? "Accepted" : "Rejected"}. Updating…
        </p>
      )}

      {canDecide && !decided && (
        <div className="space-y-2">
          {accepting && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex min-w-0 flex-col gap-1">
                <label htmlFor={meetingSelectId} className="font-medium">
                  Meeting
                </label>
                <select
                  id={meetingSelectId}
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  disabled={busy || meetings.status !== "ready"}
                  className="h-9 max-w-full rounded-md border border-slate-200 bg-white px-2 dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="">
                    {meetings.status === "ready"
                      ? "Choose a meeting…"
                      : "Loading meetings…"}
                  </option>
                  {meetings.status === "ready" &&
                    meetings.meetings.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                </select>
              </div>
              <Button
                size="sm"
                onClick={() => void decide("accept")}
                disabled={busy || meetingId === ""}
              >
                {inFlight === "accept" ? "Accepting…" : "Confirm accept"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAccepting(false)}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          )}
          {accepting && meetings.status === "error" && (
            <p role="alert" className="text-red-700 dark:text-red-400">
              {meetings.error}.{" "}
              <button type="button" className="underline" onClick={onLoadMeetings}>
                Try again
              </button>
            </p>
          )}
          {accepting &&
            meetings.status === "ready" &&
            meetings.meetings.length === 0 && (
              <p className="text-slate-600 dark:text-slate-400">
                No meeting records yet. Create one in{" "}
                <Link href="/admin/meetings" className="underline">
                  Meetings
                </Link>{" "}
                first.
              </p>
            )}
          {!accepting && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={openAccept}
                disabled={busy}
                aria-label={`Accept ${name}`}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void decide("reject")}
                disabled={busy}
                aria-label={`${inFlight === "reject" ? "Rejecting" : "Reject"} ${name}`}
              >
                {inFlight === "reject" ? "Rejecting…" : "Reject"}
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
