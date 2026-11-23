"use client";
/** Pieces every drawer flow shares: step headings, the footer, outcome alerts. */
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  ELIGIBILITY_ESCALATION_MESSAGE,
  getIneligibilityMessages,
} from "~/lib/eligibilityMessages";
import type { CommitteeDetailResponse } from "~/lib/validations/committee";
import type { ActionOutcome } from "../adapters";

export function personName(person: {
  firstName?: string | null;
  middleInitial?: string | null;
  lastName?: string | null;
}): string {
  return [person.firstName, person.middleInitial, person.lastName]
    .filter((part) => part?.trim())
    .join(" ");
}

/** The roster row for a current member, if they're on it. */
export function occupantRow(detail: CommitteeDetailResponse, memberId: string) {
  return detail.rows.find((r) => r.occupant?.VRCNUM === memberId);
}

/**
 * A current member as the drawer names them: "Jane Doe (V1), seat 1", or
 * "…, unassigned". Falls back to the VRCNUM when the roster lacks them.
 */
export function occupantLabel(
  detail: CommitteeDetailResponse,
  memberId: string,
): { name: string; label: string } {
  const row = occupantRow(detail, memberId);
  if (!row?.occupant) return { name: memberId, label: memberId };
  const name = personName(row.occupant);
  const who = `${name} (${memberId})`;
  return {
    name,
    label: row.seatNumber !== null ? `${who}, seat ${row.seatNumber}` : `${who}, unassigned`,
  };
}

export type ActionFailure = Extract<ActionOutcome, { ok: false }>;

/**
 * Runs one drawer mutation: tracks the in-flight state, keeps a failure for
 * display, and hands the success message on. The action stays in flight until
 * `onSuccess` settles, so a caller that waits for the refreshed roster keeps
 * the primary button busy until then.
 */
export function useActionSubmit(onSuccess: (message: string) => void | Promise<void>) {
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  /** Resolves to the failure, or null on success. */
  const run = async (
    mutation: () => Promise<ActionOutcome>,
  ): Promise<ActionFailure | null> => {
    setSubmitting(true);
    setFailure(null);
    // `finally`: a rejected mutation or `onSuccess` must not leave the
    // primary button stuck busy.
    try {
      const outcome = await mutation();
      if (outcome.ok) {
        await onSuccess(outcome.message);
        return null;
      }
      setFailure(outcome);
      return outcome;
    } finally {
      setSubmitting(false);
    }
  };
  return { submitting, failure, clearFailure: () => setFailure(null), run };
}

/**
 * A step's `h3` (the drawer title is the `h2`). With `focusOnMount`, focus
 * moves to it when the step appears, so keyboard and screen-reader users
 * land on the new step instead of a removed button.
 */
export function StepHeading({
  step,
  total,
  title,
  focusOnMount,
}: {
  step: number;
  total: number;
  title: string;
  focusOnMount: boolean;
}) {
  const ref = useCallback(
    (el: HTMLHeadingElement | null) => {
      if (el && focusOnMount) el.focus();
    },
    [focusOnMount],
  );
  return (
    <h3 ref={ref} tabIndex={-1} className="text-base font-semibold outline-none">
      <span className="block text-xs font-normal text-slate-500">
        Step {step} of {total}
      </span>
      {title}
    </h3>
  );
}

/** Sticky footer: secondary actions on the left, the primary on the right. */
export function DrawerFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-auto flex flex-wrap items-center justify-end gap-2 border-t bg-white px-4 py-3 dark:bg-slate-950">
      {children}
    </div>
  );
}

type FocusTarget<F> = { to: "field"; field: F } | { to: "alert" };

/**
 * A step's field errors, and where focus goes after a failure. Each message
 * sits beside its control (`fieldError`), tied to it by `aria-describedby`.
 * `show` focuses the first invalid field and `focusAlert` the failure alert,
 * once the next render is on screen; without this, a submit button disabled
 * in flight drops focus to <body>.
 *
 * `fields` is the order the controls appear in. Given a constant `fields`,
 * the returned object and its functions keep their identity until the errors
 * change (`show`, `clear`, `focusAlert`, `alertRef` and `inputId` never
 * change), so effects and callbacks can depend on them; a new `fields` array
 * each render gives a new `show` each render.
 */
export function useFieldErrors<F extends string>(fields: readonly F[]) {
  const id = useId();
  const [errors, setErrors] = useState<Partial<Record<F, string>>>({});
  const [pendingFocus, setPendingFocus] = useState<FocusTarget<F> | null>(null);
  const fieldRefs = useRef<Partial<Record<F, HTMLElement | null>>>({});
  const alertRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!pendingFocus) return;
    const target =
      pendingFocus.to === "alert" ? alertRef.current : fieldRefs.current[pendingFocus.field];
    target?.focus();
    setPendingFocus(null);
  }, [pendingFocus]);

  const inputId = useCallback((field: F) => `${id}-${field}`, [id]);
  const errorId = useCallback((field: F) => `${id}-${field}-error`, [id]);
  const show = useCallback(
    (next: Partial<Record<F, string>>): boolean => {
      const first = fields.find((field) => next[field]);
      if (first === undefined) return false;
      setErrors(next);
      setPendingFocus({ to: "field", field: first });
      return true;
    },
    [fields],
  );
  const clear = useCallback((changed: readonly F[]) => {
    setErrors((prev) => {
      if (!changed.some((field) => prev[field])) return prev;
      const next = { ...prev };
      for (const field of changed) delete next[field];
      return next;
    });
  }, []);
  const focusAlert = useCallback(() => setPendingFocus({ to: "alert" }), []);

  return useMemo(
    () => ({
      /** Shows `next` and focuses its first invalid field; false if it has none. */
      show,
      /** Drops the messages for `changed` (the user edited them). */
      clear,
      focusAlert,
      /** For `OutcomeAlert`'s `alertRef`. */
      alertRef,
      inputId,
      /** Props for a control: its id, its ref, and its error wiring. */
      fieldProps: (field: F) => ({
        id: inputId(field),
        ref: (el: HTMLElement | null) => {
          fieldRefs.current[field] = el;
        },
        "aria-invalid": errors[field] ? true : undefined,
        "aria-describedby": errors[field] ? errorId(field) : undefined,
      }),
      /** The control's message, if it has one. */
      fieldError: (field: F) => <FieldError id={errorId(field)} message={errors[field]} />,
    }),
    [show, clear, focusAlert, inputId, errorId, errors],
  );
}

/** Field-level error text, tied to its control by `id` (`aria-describedby`). */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-red-700 dark:text-red-400">
      {message}
    </p>
  );
}

/**
 * A failed mutation: the server's hard stops, or its error message.
 * Focusable (`alertRef`), so a flow can move focus here when the action fails.
 */
export function OutcomeAlert({
  outcome,
  ineligibleTitle,
  alertRef,
}: {
  outcome: Extract<ActionOutcome, { ok: false }>;
  ineligibleTitle: string;
  alertRef?: React.Ref<HTMLDivElement>;
}) {
  const alertProps = {
    variant: "destructive",
    ref: alertRef,
    tabIndex: -1,
    className: "outline-none",
  } as const;
  if (outcome.kind === "ineligible") {
    return (
      <Alert {...alertProps}>
        <AlertTitle>{ineligibleTitle}</AlertTitle>
        <AlertDescription>
          <ul className="mt-1 list-inside list-disc space-y-1">
            {getIneligibilityMessages(outcome.reasons).map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
          <p className="mt-2">{ELIGIBILITY_ESCALATION_MESSAGE}</p>
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert {...alertProps}>
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{outcome.message}</AlertDescription>
    </Alert>
  );
}
