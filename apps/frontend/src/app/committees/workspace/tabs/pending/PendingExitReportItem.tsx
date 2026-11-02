"use client";
/**
 * One pending Exit Report in the Pending tab. Everyone in scope sees the
 * member, the kind, and when it was reported. With `canDecide` (acting Admin)
 * it also shows the Admin-only context the detail carries (reporter, reason,
 * notes, resignation details) and the controls:
 *
 * - Confirm records the exit exactly as reported
 *   (`/api/committee/exitReport/confirm`). There is no editing: a report with a
 *   mistake is rejected and the Leader files it again.
 * - Reject takes an optional note and calls `/api/committee/exitReport/reject`.
 *
 * Both echo the report's `reportedAt`, so a report that changed since the
 * detail loaded is refused with "This member changed, refresh."
 */
import React, { useId, useState } from "react";

import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  formatCalendarDateForDisplay,
  formatInstantDateForDisplay,
} from "~/lib/dateUtils";
import { REMOVAL_REASON_LABELS } from "~/lib/removalReasonLabels";
import type { PendingExitReport } from "~/lib/validations/committee";
import { confirmExitReport, rejectExitReport } from "../../adapters";
import { personName, type PendingDecision } from "./PendingSubmissionItem";

export type PendingExitReportItemProps = {
  report: PendingExitReport;
  /** Acting Admin: show Admin-only context and the confirm/reject controls. */
  canDecide: boolean;
  /** After the server accepted the confirmation or rejection. */
  onDecided: (report: PendingExitReport, decision: PendingDecision) => void;
};

function reportedByText(r: PendingExitReport, canDecide: boolean): string {
  if (r.isOwnReport) return " by you";
  if (canDecide && r.reportedBy) return ` by ${r.reportedBy.name ?? "an unnamed user"}`;
  return "";
}

const METHOD_LABELS = { EMAIL: "email", MAIL: "mail" } as const;

export function PendingExitReportItem({
  report,
  canDecide,
  onDecided,
}: PendingExitReportItemProps) {
  const ids = useId();
  const name = personName(report);
  const [step, setStep] = useState<"idle" | PendingDecision>("idle");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [decided, setDecided] = useState<PendingDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: PendingDecision) => {
    setBusy(true);
    setError(null);
    const outcome =
      decision === "accept"
        ? await confirmExitReport(report)
        : await rejectExitReport(report, note);
    setBusy(false);
    if (outcome.ok) {
      setDecided(decision);
      onDecided(report, decision);
    } else {
      const verb = decision === "accept" ? "confirm" : "reject";
      setError(
        `Could not ${verb}: ${outcome.kind === "error" ? outcome.message : "Something went wrong."}`,
      );
    }
  };

  const kindLabel = report.kind === "RESIGNATION" ? "Resignation" : "Removal";
  const kindWord = kindLabel.toLowerCase();

  return (
    <li
      className="space-y-2 rounded-md border p-3"
      aria-labelledby={`${ids}-name`}
      aria-busy={busy}
    >
      <div>
        <p id={`${ids}-name`} className="font-medium">
          {name}
          {report.seatNumber !== null && (
            <span className="font-normal text-slate-500"> · Seat {report.seatNumber}</span>
          )}
        </p>
        <p className="text-slate-600 dark:text-slate-400">
          {kindLabel} reported {formatInstantDateForDisplay(report.reportedAt)}
          {reportedByText(report, canDecide)}
        </p>
      </div>

      {canDecide && (
        <div className="space-y-0.5">
          {report.removalReason && (
            <p>
              <span className="font-medium">Reason:</span>{" "}
              {REMOVAL_REASON_LABELS[report.removalReason]}
            </p>
          )}
          {report.removalNotes && (
            <p>
              <span className="font-medium">Notes:</span> {report.removalNotes}
            </p>
          )}
          {report.kind === "RESIGNATION" &&
            (report.resignationDateReceived != null ||
              report.resignationMethod != null) && (
              <p>
                <span className="font-medium">Received:</span>{" "}
                {report.resignationDateReceived
                  ? formatCalendarDateForDisplay(report.resignationDateReceived)
                  : "date not given"}
                {report.resignationMethod
                  ? ` by ${METHOD_LABELS[report.resignationMethod]}`
                  : ""}
              </p>
            )}
        </div>
      )}

      {canDecide && decided && (
        <p className="font-medium">
          {decided === "accept" ? "Confirmed" : "Rejected"}. Updating…
        </p>
      )}

      {canDecide && !decided && (
        <div className="space-y-2">
          {step === "accept" && (
            <div className="space-y-2">
              <p>
                Record this {kindWord} exactly as reported? To change anything,
                reject it so the Leader can report it again.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void decide("accept")} disabled={busy}>
                  {busy ? "Confirming…" : `Confirm ${kindWord}`}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStep("idle")} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {step === "reject" && (
            <div className="space-y-2">
              <div className="grid gap-1">
                <label htmlFor={`${ids}-note`} className="font-medium">
                  Note (optional)
                </label>
                <Textarea
                  id={`${ids}-note`}
                  rows={2}
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void decide("reject")} disabled={busy}>
                  {busy ? "Rejecting…" : "Confirm reject"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStep("idle")} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {step === "idle" && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => setStep("accept")}
                aria-label={`Confirm ${kindWord} of ${name}`}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStep("reject")}
                aria-label={`Reject ${kindWord} report for ${name}`}
              >
                Reject
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
