"use client";
/**
 * Exit Reports (leader-feedback-2026-11 ticket 01).
 *
 * - `ReportExitForm`: a Leader / RequestAccess user reports that a member
 *   resigned or should be removed. Submitting first shows the Admin-set
 *   instructions (fetched each time, so an edit is never stale); the report
 *   is sent once the Leader acknowledges them. The member stays on the
 *   committee until an Admin confirms.
 * - `ConfirmExitReportForm`: an Admin confirms a pending report through the
 *   existing Record resignation / Remove member form, prefilled from the
 *   report, with the kind switchable. The endpoint refuses (409) if the report
 *   changed since the Admin loaded it.
 */
import React, { useEffect, useId, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatCalendarDateForDisplay } from "~/lib/dateUtils";
import { linkifyText } from "~/lib/linkify";
import { REMOVAL_REASON_LABELS } from "~/lib/removalReasonLabels";
import type { ExitReportKind } from "@prisma/client";
import type { PendingExitReport } from "~/lib/validations/committee";
import {
  exitReportProblems,
  fetchExitInstructions,
  submitExitReport,
  type ExitReportAction,
  type ExitReportInput,
} from "../adapters";
import type { CommitteeAction } from "../committeeAction";
import { useActionSubmit } from "./drawerParts";
import {
  ExitFormLayout,
  RecordResignationForm,
  ReasonAndNotes,
  RemoveMemberForm,
  RESIGNATION_METHODS,
} from "./MemberExitForms";

const KINDS: Array<[ExitReportKind, string]> = [
  ["RESIGNATION", "Resigned"],
  ["REMOVAL", "Should be removed"],
];

/** Plain text with emails and URLs as links; line breaks kept. */
export function LinkifiedText({ text }: { text: string }) {
  return (
    <span className="whitespace-pre-line">
      {linkifyText(text).map((part, i) =>
        part.kind === "link" ? (
          <a
            key={i}
            href={part.href}
            className="text-blue-700 underline dark:text-blue-400"
            {...(part.href.startsWith("http")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {part.text}
          </a>
        ) : (
          <React.Fragment key={i}>{part.text}</React.Fragment>
        ),
      )}
    </span>
  );
}

type InstructionsState =
  | { status: "loading" }
  | { status: "ready"; text: string | null }
  | { status: "error"; message: string };

/**
 * The instructions shown before a report is sent. Fetched when it opens.
 * Continue is offered once the text has loaded (or failed to: the report can
 * still be filed, and the dialog says the instructions couldn't load).
 */
export function ExitInstructionsDialog({
  open,
  onCancel,
  onContinue,
}: {
  open: boolean;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const [state, setState] = useState<InstructionsState>({ status: "loading" });

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchExitInstructions(controller.signal)
      .then((text) => setState({ status: "ready", text }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Could not load the instructions",
        });
      });
    return () => controller.abort();
  }, [open]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Before you send this report</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              {state.status === "loading" && <p>Loading instructions…</p>}
              {state.status === "ready" && state.text && (
                <p data-testid="exit-instructions">
                  <LinkifiedText text={state.text} />
                </p>
              )}
              {state.status === "error" && (
                <p role="alert">
                  {state.message}. You can still send the report.
                </p>
              )}
              <p>
                An Admin reviews the report. The member stays on the committee
                until it is confirmed.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Go back</AlertDialogCancel>
          <AlertDialogAction
            disabled={state.status === "loading"}
            onClick={onContinue}
          >
            I understand, send report
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const EMPTY_REPORT: ExitReportInput = {
  kind: "",
  reason: "",
  notes: "",
  dateReceived: "",
  method: "",
};

/** A Leader's Exit Report: kind, reason, notes (Other), optional resignation details. */
export function ReportExitForm({
  action,
  memberLabel,
  onCancel,
  onSuccess,
}: {
  action: ExitReportAction;
  memberLabel: string;
  onCancel: () => void;
  onSuccess: (message: string) => void;
}) {
  const id = useId();
  const [input, setInput] = useState<ExitReportInput>(EMPTY_REPORT);
  const [confirming, setConfirming] = useState(false);
  const { submitting, failure, run } = useActionSubmit(onSuccess);
  const setField = (patch: Partial<ExitReportInput>) =>
    setInput((prev) => ({ ...prev, ...patch }));
  const send = () => {
    setConfirming(false);
    void run(() => submitExitReport(action, input));
  };

  return (
    <>
      <ExitFormLayout
        problems={exitReportProblems(input)}
        failure={failure}
        failureTitle="Could not send the report"
        submitting={submitting}
        primaryLabel="Report"
        busyLabel="Sending…"
        onCancel={onCancel}
        onSubmit={() => setConfirming(true)}
      >
        <p className="text-sm">
          Reporting that <span className="font-medium">{memberLabel}</span> is
          leaving the committee. An Admin confirms or rejects the report; until
          then the member stays on the committee.
        </p>
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">What happened (required)</legend>
          <div className="flex flex-wrap gap-4">
            {KINDS.map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`${id}-kind`}
                  value={value}
                  checked={input.kind === value}
                  onChange={() => setField({ kind: value })}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <ReasonAndNotes
          label={input.kind === "RESIGNATION" ? "Reason for resignation" : "Reason"}
          value={input}
          onChange={setField}
        />
        {input.kind === "RESIGNATION" && (
          <>
            <div className="grid gap-1">
              <Label htmlFor={`${id}-date`}>
                Date resignation received (if known)
              </Label>
              <Input
                id={`${id}-date`}
                type="date"
                value={input.dateReceived}
                onChange={(e) => setField({ dateReceived: e.target.value })}
              />
            </div>
            <fieldset className="space-y-1">
              <legend className="text-sm font-medium">
                How it was received (if known)
              </legend>
              <div className="flex gap-4">
                {RESIGNATION_METHODS.map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`${id}-method`}
                      value={value}
                      checked={input.method === value}
                      onChange={() => setField({ method: value })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}
      </ExitFormLayout>
      <ExitInstructionsDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onContinue={send}
      />
    </>
  );
}

type ConfirmAction = Extract<CommitteeAction, { kind: "confirm-exit-report" }>;

/** "YYYY-MM-DD" for a date input, from an ISO timestamp. */
function dateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

/** What the Leader reported, above the Admin's prefilled form. */
function ReportSummary({ report }: { report: PendingExitReport }) {
  return (
    <div
      data-testid="exit-report-summary"
      className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
    >
      <p className="font-medium">
        {report.kind === "RESIGNATION" ? "Resignation" : "Removal"} reported{" "}
        {formatCalendarDateForDisplay(report.reportedAt)}
        {report.reportedBy?.name ? ` by ${report.reportedBy.name}` : ""}
      </p>
      {report.removalReason && (
        <p>Reason: {REMOVAL_REASON_LABELS[report.removalReason]}</p>
      )}
      <p>The form below starts from the report. Correct anything before confirming.</p>
    </div>
  );
}

/**
 * Confirm a pending Exit Report: the Record resignation or Remove member form,
 * prefilled, with the kind switchable. Whatever the Admin submits replaces the
 * reported values (blank fields are saved blank).
 */
export function ConfirmExitReportForm({
  action,
  memberLabel,
  onCancel,
  onSuccess,
}: {
  action: ConfirmAction;
  memberLabel: string;
  onCancel: () => void;
  onSuccess: (message: string) => void;
}) {
  const id = useId();
  const { report } = action;
  const [kind, setKind] = useState<ExitReportKind>(report.kind);
  const confirm = { exitReportedAt: report.reportedAt };
  const initial = {
    reason: report.removalReason ?? "",
    notes: report.removalNotes ?? "",
    dateReceived: dateInputValue(report.resignationDateReceived),
    method: report.resignationMethod ?? "",
  } as const;

  const intro = (
    <>
      <ReportSummary report={report} />
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Record as</legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ["RESIGNATION", "Resignation"],
              ["REMOVAL", "Removal"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${id}-confirm-kind`}
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );

  return kind === "RESIGNATION" ? (
    <RecordResignationForm
      key="resignation"
      action={{ kind: "record-resignation", committee: action.committee, memberId: action.memberId }}
      memberLabel={memberLabel}
      onCancel={onCancel}
      onSuccess={onSuccess}
      initial={initial}
      confirm={confirm}
      intro={intro}
    />
  ) : (
    <RemoveMemberForm
      key="removal"
      action={{ kind: "remove-member", committee: action.committee, memberId: action.memberId }}
      memberLabel={memberLabel}
      onCancel={onCancel}
      onSuccess={onSuccess}
      initial={initial}
      confirm={confirm}
      intro={intro}
    />
  );
}
