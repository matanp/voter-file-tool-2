"use client";
/** Pieces every drawer flow shares: step headings, the footer, outcome alerts. */
import React, { useCallback, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  ELIGIBILITY_ESCALATION_MESSAGE,
  getIneligibilityMessages,
} from "~/lib/eligibilityMessages";
import type { CommitteeDetailResponse } from "~/lib/validations/committee";
import type { ActionOutcome } from "../adapters";
import { hasLegDistrict, type CommitteeRef } from "../committeeAction";

/** "GREECE · LD 1 · ED 5" (no LD for towns without one). */
export function committeeLabel(committee: CommitteeRef): string {
  return [
    committee.cityTown,
    ...(hasLegDistrict(committee) ? [`LD ${committee.legDistrict}`] : []),
    `ED ${committee.electionDistrict}`,
  ].join(" · ");
}

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
 * display, and hands the success message on.
 */
export function useActionSubmit(onSuccess: (message: string) => void) {
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const run = async (mutation: () => Promise<ActionOutcome>) => {
    setSubmitting(true);
    setFailure(null);
    const outcome = await mutation();
    setSubmitting(false);
    if (outcome.ok) onSuccess(outcome.message);
    else setFailure(outcome);
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

/** A failed mutation: the server's hard stops, or its error message. */
export function OutcomeAlert({
  outcome,
  ineligibleTitle,
}: {
  outcome: Extract<ActionOutcome, { ok: false }>;
  ineligibleTitle: string;
}) {
  if (outcome.kind === "ineligible") {
    return (
      <Alert variant="destructive">
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
    <Alert variant="destructive">
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{outcome.message}</AlertDescription>
    </Alert>
  );
}
