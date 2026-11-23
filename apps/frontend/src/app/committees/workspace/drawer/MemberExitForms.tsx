"use client";
/**
 * Removal and resignation (plan §9, ticket 14), moved out of
 * `CommitteeSelector.tsx`. The drawer renders them for `remove-member` and
 * `record-resignation`. Until cutover (ticket 16), the legacy selector's
 * dialogs render the same forms, so the domain rules live in one place:
 *
 * - removal requires a reason, and **Other** requires notes (SRS 2.5);
 * - resignation requires the received date and method, and has no reason
 *   (SRS 2.3 / §6.5); notes are optional.
 *
 * Both are Admin-only endpoints that audit the change. The primary action
 * stays disabled until the requirements are met, and what's missing is
 * listed beside it in text.
 *
 * Resignation Letters (ticket 08): a resignation takes an optional upload.
 * Without one, a letter on the member's pending resignation report is kept;
 * the Admin's own upload replaces it.
 */
import React, { useEffect, useId, useRef, useState } from "react";
import type { ResignationMethod } from "@prisma/client";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioOption } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { REMOVAL_REASONS, REMOVAL_REASON_LABELS } from "~/lib/removalReasonLabels";
import {
  removalProblems,
  resignationProblems,
  submitRemoval,
  submitResignation,
  type RemovalAction,
  type RemovalInput,
  type ResignationAction,
  type ResignationInput,
} from "../adapters";
import {
  DrawerFooter,
  OutcomeAlert,
  useActionSubmit,
  type ActionFailure,
} from "./drawerParts";
import {
  EMPTY_LETTER,
  ResignationLetterField,
  letterAfterSubmit,
  letterFieldProblems,
  stagedLetterOf,
  type LetterFieldState,
} from "./ResignationLetterField";

export const NOTES_MAX = 1000;

export const RESIGNATION_METHODS: Array<[ResignationMethod, string]> = [
  ["EMAIL", "Email"],
  ["MAIL", "Mail"],
];

type MemberExitFormProps<A> = {
  action: A;
  /** Who is leaving, e.g. "Jane Doe (V1), seat 1". */
  memberLabel: string;
  onCancel: () => void;
  /** After a successful mutation; `message` is the success toast's text. */
  onSuccess: (message: string) => void;
  /** Wraps the buttons. Defaults to the drawer's sticky footer. */
  Footer?: React.ComponentType<{ children: React.ReactNode }>;
  /** Classes for the scrolling body. Defaults to the drawer's padding. */
  bodyClassName?: string;
};

const DRAWER_BODY = "flex-1 space-y-4 overflow-y-auto px-4 py-4";

/**
 * Shared layout: body, failure alert, requirements hint, and footer buttons.
 * Each new failure moves focus to its alert, so focus never drops to <body>
 * when the in-flight submit button re-enables.
 */
export function ExitFormLayout({
  children,
  problems,
  failure,
  failureTitle,
  submitting,
  primaryLabel,
  busyLabel,
  onCancel,
  onSubmit,
  Footer = DrawerFooter,
  bodyClassName = DRAWER_BODY,
}: {
  children: React.ReactNode;
  problems: string[];
  failure: ActionFailure | null;
  failureTitle: string;
  submitting: boolean;
  primaryLabel: string;
  busyLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
  Footer?: React.ComponentType<{ children: React.ReactNode }>;
  bodyClassName?: string;
}) {
  const hintId = useId();
  const alertRef = useRef<HTMLDivElement | null>(null);
  // The alert is on screen by the time this runs. `failure` is a new object
  // for every failed submit, so a repeat failure moves focus again.
  useEffect(() => {
    if (failure) alertRef.current?.focus();
  }, [failure]);
  return (
    <>
      <div className={bodyClassName}>
        {children}
        {failure && (
          <OutcomeAlert alertRef={alertRef} outcome={failure} ineligibleTitle={failureTitle} />
        )}
        {problems.length > 0 && (
          <div id={hintId} data-testid="member-exit-requirements" className="text-sm text-slate-600 dark:text-slate-400">
            <p>To continue:</p>
            <ul className="list-inside list-disc">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Footer>
        <Button type="button" variant="outline" disabled={submitting} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={submitting || problems.length > 0}
          aria-busy={submitting || undefined}
          aria-describedby={problems.length > 0 ? hintId : undefined}
          onClick={onSubmit}
        >
          {submitting ? busyLabel : primaryLabel}
        </Button>
      </Footer>
    </>
  );
}

/** Free-text notes, required when the removal reason is Other. */
export function NotesField({
  value,
  required,
  onChange,
}: {
  value: string;
  required: boolean;
  onChange: (notes: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{required ? "Notes (required)" : "Notes (optional)"}</Label>
      <Textarea
        id={id}
        rows={3}
        maxLength={NOTES_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** A removal's reason, and notes (required for Other). */
export function ReasonAndNotes({
  value,
  onChange,
}: {
  value: RemovalInput;
  onChange: (patch: Partial<RemovalInput>) => void;
}) {
  const id = useId();
  return (
    <>
      <div className="grid gap-1">
        <Label htmlFor={`${id}-reason`}>Reason for removal (required)</Label>
        <Select
          value={value.reason}
          onValueChange={(reason) =>
            onChange({ reason: reason as RemovalInput["reason"] })
          }
        >
          <SelectTrigger id={`${id}-reason`}>
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {REMOVAL_REASONS.map((reason) => (
              <SelectItem key={reason} value={reason}>
                {REMOVAL_REASON_LABELS[reason]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <NotesField
        value={value.notes}
        required={value.reason === "OTHER"}
        onChange={(notes) => onChange({ notes })}
      />
    </>
  );
}

/** A resignation's date received and method (both required, SRS §6.5). */
export function ResignationReceivedFields({
  value,
  onChange,
}: {
  value: Pick<ResignationInput, "dateReceived" | "method">;
  onChange: (patch: Partial<ResignationInput>) => void;
}) {
  const id = useId();
  return (
    <>
      <div className="grid gap-1">
        <Label htmlFor={`${id}-date`}>Date resignation received (required)</Label>
        <Input
          id={`${id}-date`}
          type="date"
          value={value.dateReceived}
          onChange={(e) => onChange({ dateReceived: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label id={`${id}-method`}>How it was received (required)</Label>
        <RadioGroup
          aria-labelledby={`${id}-method`}
          value={value.method}
          onValueChange={(method) =>
            onChange({ method: method as ResignationMethod })
          }
          className="flex gap-4"
        >
          {RESIGNATION_METHODS.map(([method, label]) => (
            <RadioOption
              key={method}
              id={`${id}-method-${method}`}
              value={method}
              label={label}
            />
          ))}
        </RadioGroup>
      </div>
    </>
  );
}

/** Administrative removal: a reason, and notes for Other. */
export function RemoveMemberForm({
  action,
  memberLabel,
  onCancel,
  onSuccess,
  Footer,
  bodyClassName,
}: MemberExitFormProps<RemovalAction>) {
  const [input, setInput] = useState<RemovalInput>({ reason: "", notes: "" });
  const { submitting, failure, run } = useActionSubmit(onSuccess);
  const submit = () => run(() => submitRemoval(action, input));

  return (
    <ExitFormLayout
      problems={removalProblems(input)}
      failure={failure}
      failureTitle="Could not remove member"
      submitting={submitting}
      primaryLabel="Remove member"
      busyLabel="Removing…"
      onCancel={onCancel}
      onSubmit={() => void submit()}
      Footer={Footer}
      bodyClassName={bodyClassName}
    >
      <p className="text-sm">
        Removing <span className="font-medium">{memberLabel}</span> from the
        committee. This is an administrative removal, not a resignation.
      </p>
      <ReasonAndNotes
        value={input}
        onChange={(patch) => setInput((prev) => ({ ...prev, ...patch }))}
      />
    </ExitFormLayout>
  );
}

/** Resignation: the received date and method, and optional notes. */

export function RecordResignationForm({
  action,
  memberLabel,
  onCancel,
  onSuccess,
  Footer,
  bodyClassName,
}: MemberExitFormProps<ResignationAction>) {
  const [input, setInput] = useState<ResignationInput>({
    dateReceived: "",
    method: "",
    notes: "",
  });
  const [letter, setLetter] = useState<LetterFieldState>(EMPTY_LETTER);
  const { submitting, failure, run } = useActionSubmit(onSuccess);
  const setField = (patch: Partial<ResignationInput>) =>
    setInput((prev) => ({ ...prev, ...patch }));
  const staged = stagedLetterOf(letter);
  const submit = () =>
    run(async () => {
      const after = letterAfterSubmit(letter, await submitResignation(action, input, staged));
      setLetter(after.letter);
      return after.outcome;
    });
  const problems = [
    ...resignationProblems(input),
    ...letterFieldProblems(letter),
  ];

  return (
    <ExitFormLayout
      problems={problems}
      failure={failure}
      failureTitle="Could not record resignation"
      submitting={submitting}
      primaryLabel="Record resignation"
      busyLabel="Saving…"
      onCancel={onCancel}
      onSubmit={() => void submit()}
      Footer={Footer}
      bodyClassName={bodyClassName}
    >
      <p className="text-sm">
        Recording a resignation for <span className="font-medium">{memberLabel}</span>.
      </p>
      <ResignationReceivedFields value={input} onChange={setField} />
      <ResignationLetterField
        target={action}
        value={letter}
        onChange={setLetter}
        disabled={submitting}
      />
      <NotesField
        value={input.notes}
        required={false}
        onChange={(notes) => setField({ notes })}
      />
    </ExitFormLayout>
  );
}
