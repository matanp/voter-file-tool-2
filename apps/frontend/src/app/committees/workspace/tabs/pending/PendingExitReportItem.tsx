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
 * - Reject calls `/api/committee/exitReport/reject`; the Leader can report again.
 *
 * Both go through the same modal: it states what the decision does, takes an
 * optional note (audited with the decision), stays open while the request runs
 * and shows a failure inside it, and closes once the server accepts.
 *
 * Both echo the report's `reportedAt`, so a report that changed since the
 * detail loaded is refused with "This member changed, refresh."
 */
import React, { useId, useRef, useState, type RefObject } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
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
  /**
   * Where focus lands after a successful decision, since the buttons that
   * opened the dialog are gone. Pass something that outlives this item (the
   * item is removed once the parent refreshes); without it, focus goes to the
   * item's own "Confirmed. Updating…" line.
   */
  focusAfterDecisionRef?: RefObject<HTMLElement | null>;
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
  focusAfterDecisionRef,
}: PendingExitReportItemProps) {
  const ids = useId();
  const name = personName(report);
  const [step, setStep] = useState<"idle" | PendingDecision>("idle");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [decided, setDecided] = useState<PendingDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const decidedLineRef = useRef<HTMLParagraphElement>(null);
  // The dialog is opened from plain buttons, not a Radix Trigger, so focus is
  // returned by hand: to the opening button on cancel.
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const decide = async (decision: PendingDecision) => {
    setBusy(true);
    setError(null);
    const outcome =
      decision === "accept"
        ? await confirmExitReport(report, note)
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

  const openDecision = (decision: PendingDecision, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setNote("");
    setError(null);
    setStep(decision);
  };

  const dialogStep = step === "idle" ? null : step;

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
        <p ref={decidedLineRef} tabIndex={-1} className="font-medium outline-none">
          {decided === "accept" ? "Confirmed" : "Rejected"}. Updating…
        </p>
      )}

      {canDecide && !decided && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={(e) => openDecision("accept", e.currentTarget)}
            aria-label={`Confirm ${kindWord} of ${name}`}
          >
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => openDecision("reject", e.currentTarget)}
            aria-label={`Reject ${kindWord} report for ${name}`}
          >
            Reject
          </Button>
        </div>
      )}

      <AlertDialog
        open={canDecide && !decided && dialogStep !== null}
        onOpenChange={(next) => {
          if (!next && !busy) setStep("idle");
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            const target = decided
              ? (focusAfterDecisionRef?.current ?? decidedLineRef.current)
              : openerRef.current;
            target?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogStep === "reject"
                ? `Reject ${kindWord} report for ${name}?`
                : `Confirm ${kindWord} of ${name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogStep === "reject"
                ? `The member stays on the committee and the Leader can report the ${kindWord} again.`
                : `Record this ${kindWord} exactly as reported? To change anything, reject it so the Leader can report it again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-1">
            <Label htmlFor={`${ids}-note`}>Note (optional)</Label>
            <Textarea
              id={`${ids}-note`}
              rows={2}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
            />
          </div>
          {error && (
            <p role="alert" className="text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button
              onClick={() => dialogStep && void decide(dialogStep)}
              disabled={busy}
            >
              {dialogStep === "reject"
                ? busy
                  ? "Rejecting…"
                  : "Yes, reject report"
                : busy
                  ? "Confirming…"
                  : `Confirm ${kindWord}`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
