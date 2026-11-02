"use client";
/**
 * Exit Reports (leader-feedback-2026-11 ticket 01).
 *
 * - `ReportExitForm`: a Leader / RequestAccess user reports that a member
 *   resigned or should be removed. Submitting first shows the Admin-set
 *   instructions (fetched each time, so an edit is never stale); the report
 *   is sent once the Leader acknowledges them. The member stays on the
 *   committee until an Admin confirms.
 *
 * An Admin confirms or rejects the report as filed (Pending tab); there is no
 * editing, so the report carries everything the recorded exit needs: a
 * resignation's date received and method, or a removal's reason.
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
import { linkifyText } from "~/lib/linkify";
import type { ExitReportKind } from "@prisma/client";
import {
  exitReportProblems,
  fetchExitInstructions,
  submitExitReport,
  type ExitReportAction,
  type ExitReportInput,
} from "../adapters";
import { useActionSubmit } from "./drawerParts";
import {
  ExitFormLayout,
  NotesField,
  ReasonAndNotes,
  ResignationReceivedFields,
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
 * Continue is offered only after the current text has loaded. A missing
 * configured value is valid; a failed request is not treated as an empty
 * configuration because the Leader may otherwise miss updated instructions.
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
          message:
            err instanceof Error
              ? err.message
              : "Could not load the instructions",
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
                  {state.message}. Go back and try again before sending the
                  report.
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
            disabled={state.status !== "ready"}
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

/**
 * A Leader's Exit Report: the kind, then that kind's fields. A resignation
 * takes the date received and method (no reason); a removal takes a reason
 * (notes for Other). Switching kinds keeps what was typed, but only the
 * chosen kind's fields are sent.
 */
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
          <legend className="text-sm font-medium">
            What happened (required)
          </legend>
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
        {input.kind === "RESIGNATION" && (
          <>
            <ResignationReceivedFields value={input} onChange={setField} />
            <NotesField
              value={input.notes}
              required={false}
              onChange={(notes) => setField({ notes })}
            />
          </>
        )}
        {input.kind === "REMOVAL" && (
          <ReasonAndNotes value={input} onChange={setField} />
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
