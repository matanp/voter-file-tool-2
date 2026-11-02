"use client";
/**
 * Exit Reports (leader-feedback-2026-11 ticket 01).
 *
 * - `ReportExitForm`: a Leader / RequestAccess user reports that a member
 *   resigned or should be removed. Submitting first shows the Admin-set
 *   instructions (prefetched when the form opens and refreshed each time the
 *   dialog opens, so they show at once and an Admin's edit still lands); the
 *   report is sent once the Leader acknowledges them. The member stays on the
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
import { Label } from "~/components/ui/label";
import { RadioCard, RadioGroup } from "~/components/ui/radio-group";
import { linkifyText } from "~/lib/linkify";
import type { ExitReportKind } from "@prisma/client";
import {
  exitReportProblems,
  cachedExitInstructions,
  loadExitInstructions,
  prefetchExitInstructions,
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

const KINDS: Array<{ value: ExitReportKind; label: string; hint: string }> = [
  {
    value: "RESIGNATION",
    label: "Resigned",
    hint: "They told you they're leaving, by email or letter.",
  },
  {
    value: "REMOVAL",
    label: "Should be removed",
    hint: "They moved, changed party, are inactive or deceased, or another reason.",
  },
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
            className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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

function cachedState(): InstructionsState {
  const text = cachedExitInstructions();
  return text === undefined ? { status: "loading" } : { status: "ready", text };
}

/**
 * The instructions shown before a report is sent. The report form prefetches
 * them, so the dialog shows the cached text at once and refreshes it in the
 * background each time it opens, swapping in an Admin's edit when one lands.
 * Continue is offered only once some loaded text is showing. A missing
 * configured value is valid; a failed request with nothing cached is not
 * treated as an empty configuration because the Leader may otherwise miss
 * updated instructions. A failed refresh keeps the cached text.
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
  const [state, setState] = useState<InstructionsState>(cachedState);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setState(cachedState());
    loadExitInstructions()
      .then((text) => {
        if (active) setState({ status: "ready", text });
      })
      .catch((err: unknown) => {
        if (!active || cachedExitInstructions() !== undefined) return;
        setState({
          status: "error",
          message:
            err instanceof Error
              ? err.message
              : "Could not load the instructions",
        });
      });
    return () => {
      active = false;
    };
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
  useEffect(prefetchExitInstructions, []);
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
        <div className="grid gap-2">
          <Label id={`${id}-kind`}>What happened (required)</Label>
          <RadioGroup
            aria-labelledby={`${id}-kind`}
            value={input.kind}
            onValueChange={(kind) => setField({ kind: kind as ExitReportKind })}
          >
            {KINDS.map(({ value, label, hint }) => (
              <RadioCard
                key={value}
                id={`${id}-kind-${value}`}
                value={value}
                label={label}
                hint={hint}
              />
            ))}
          </RadioGroup>
        </div>
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
