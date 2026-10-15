"use client";
/**
 * Removal and resignation (plan §9, ticket 14), moved out of
 * `CommitteeSelector.tsx`. The drawer renders them for `remove-member` and
 * `record-resignation`. Until cutover (ticket 16), the legacy selector's
 * dialogs render the same forms, so the domain rules live in one place:
 *
 * - removal requires a reason, and **Other** requires notes (SRS 2.5);
 * - resignation requires the received date, method and a reason (SRS 2.3).
 *
 * Both are Admin-only endpoints that audit the change. The primary action
 * stays disabled until the requirements are met, and what's missing is
 * listed beside it in text.
 */
import React, { useId, useState } from "react";
import type { ResignationMethod } from "@prisma/client";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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

const NOTES_MAX = 1000;



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

/** Shared layout: body, failure alert, requirements hint, and footer buttons. */
function ExitFormLayout({
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
  return (
    <>
      <div className={bodyClassName}>
        {children}
        {failure && <OutcomeAlert outcome={failure} ineligibleTitle={failureTitle} />}
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

function ReasonAndNotes({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RemovalInput;
  onChange: (patch: Partial<RemovalInput>) => void;
}) {
  const id = useId();
  const notesRequired = value.reason === "OTHER";
  return (
    <>
      <div className="grid gap-1">
        <Label htmlFor={`${id}-reason`}>{label} (required)</Label>
        <select
          id={`${id}-reason`}
          value={value.reason}
          onChange={(e) =>
            onChange({ reason: e.target.value as RemovalInput["reason"] })
          }
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <option value="">Select a reason</option>
          {REMOVAL_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {REMOVAL_REASON_LABELS[reason]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${id}-notes`}>
          {notesRequired ? "Notes (required)" : "Notes (optional)"}
        </Label>
        <Textarea
          id={`${id}-notes`}
          rows={3}
          maxLength={NOTES_MAX}
          value={value.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
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
        label="Reason for removal"
        value={input}
        onChange={(patch) => setInput((prev) => ({ ...prev, ...patch }))}
      />
    </ExitFormLayout>
  );
}

const METHODS: Array<[ResignationMethod, string]> = [
  ["EMAIL", "Email"],
  ["MAIL", "Mail"],
];

/** Resignation: the received date, method, and a reason (notes for Other). */
export function RecordResignationForm({
  action,
  memberLabel,
  onCancel,
  onSuccess,
  Footer,
  bodyClassName,
}: MemberExitFormProps<ResignationAction>) {
  const id = useId();
  const [input, setInput] = useState<ResignationInput>({
    dateReceived: "",
    method: "",
    reason: "",
    notes: "",
  });
  const { submitting, failure, run } = useActionSubmit(onSuccess);
  const setField = (patch: Partial<ResignationInput>) =>
    setInput((prev) => ({ ...prev, ...patch }));
  const submit = () => run(() => submitResignation(action, input));

  return (
    <ExitFormLayout
      problems={resignationProblems(input)}
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
      <div className="grid gap-1">
        <Label htmlFor={`${id}-date`}>Date resignation received (required)</Label>
        <Input
          id={`${id}-date`}
          type="date"
          value={input.dateReceived}
          onChange={(e) => setField({ dateReceived: e.target.value })}
        />
      </div>
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">How it was received (required)</legend>
        <div className="flex gap-4">
          {METHODS.map(([value, label]) => (
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
      <ReasonAndNotes label="Reason for resignation" value={input} onChange={setField} />
    </ExitFormLayout>
  );
}
