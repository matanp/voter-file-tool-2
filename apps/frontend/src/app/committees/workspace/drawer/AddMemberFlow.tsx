"use client";
/**
 * The add-member / replace-member flow (plan §8): four steps in one drawer,
 * no nested dialogs.
 *
 * 1. Find candidate. 2. Review: identity, server hard stops and warnings,
 * seats (an Admin may override hard stops, with a reason, where the server
 * permits it). 3. Membership details. 4. Confirm: explicit destination and the
 * role's primary action (**Add member** / **Submit candidate**).
 *
 * Eligibility is server-decided throughout: the preflight shows what the
 * server would say, and the mutation endpoint has the final word (its hard
 * stops come back into the confirm step, and the drawer stays open).
 */
import React, { useId, useMemo, useState } from "react";
import type { MembershipType } from "@prisma/client";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import type { CommitteeDetailResponse } from "~/lib/validations/committee";
import ContactInfoLabel from "../../ContactInfoLabel";
import EligibilitySnapshotPanel from "../../EligibilitySnapshotPanel";
import {
  submitCandidate,
  type CandidateAction,
  type CandidateRecord,
  type CandidateSubmissionMode,
} from "../adapters";
import {
  CandidateSearchStep,
  EMPTY_CANDIDATE_SEARCH,
  candidateAddress,
  type CandidateSearchState,
} from "./CandidateSearchStep";
import {
  DrawerFooter,
  OutcomeAlert,
  StepHeading,
  committeeLabel,
  occupantLabel,
  personName,
  useActionSubmit,
} from "./drawerParts";
import { useCandidateEligibility } from "./useCandidateEligibility";

type Step = "find" | "review" | "details" | "confirm";
const STEPS: Record<Step, { n: number; title: string }> = {
  find: { n: 1, title: "Find candidate" },
  review: { n: 2, title: "Review candidate" },
  details: { n: 3, title: "Membership details" },
  confirm: { n: 4, title: "Confirm" },
};

const OVERRIDE_REASON_MAX = 500;
const NOTES_MAX = 1000;

type Details = {
  membershipType: MembershipType;
  email: string;
  phone: string;
  notes: string;
  overrideReason: string;
};

const EMPTY_DETAILS: Details = {
  membershipType: "APPOINTED",
  email: "",
  phone: "",
  notes: "",
  overrideReason: "",
};

export type AddMemberFlowProps = {
  action: CandidateAction;
  mode: CandidateSubmissionMode;
  detail: CommitteeDetailResponse;
  onCancel: () => void;
  /** After a successful mutation; `message` is the success toast's text. */
  onSuccess: (message: string) => void;
};

export function AddMemberFlow({
  action,
  mode,
  detail,
  onCancel,
  onSuccess,
}: AddMemberFlowProps) {
  const id = useId();
  const [step, setStep] = useState<Step>("find");
  const [moved, setMoved] = useState(false);
  const [search, setSearch] = useState<CandidateSearchState>(EMPTY_CANDIDATE_SEARCH);
  const [candidate, setCandidate] = useState<CandidateRecord | null>(null);
  const [override, setOverride] = useState(false);
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const { submitting, failure, clearFailure, run } = useActionSubmit(onSuccess);

  const eligibility = useCandidateEligibility(action.committee, candidate?.VRCNUM ?? null);
  const existingMemberIds = useMemo(
    () =>
      new Set(
        detail.rows.flatMap((r) => (r.occupant ? [r.occupant.VRCNUM] : [])),
      ),
    [detail.rows],
  );
  // Server counts: occupied seats plus unassigned active members.
  const committeeFull =
    action.kind === "add-member" &&
    detail.rollup.filled + detail.rollup.unassignedCount >= detail.maxSeatsPerLted;
  const target =
    action.kind === "replace-member" ? occupantLabel(detail, action.memberId) : null;

  const isAdd = mode === "add";
  const primaryLabel = isAdd ? "Add member" : "Submit candidate";
  const hardStops =
    eligibility.status === "ready" ? eligibility.preflight.hardStops : [];
  const overriding = isAdd && override && hardStops.length > 0;

  const goToStep = (next: Step) => {
    setMoved(true);
    clearFailure();
    setStep(next);
  };
  const setDetail = (patch: Partial<Details>) =>
    setDetails((prev) => ({ ...prev, ...patch }));

  const submit = (selected: CandidateRecord) =>
    run(() =>
      submitCandidate(action, mode, {
        candidateId: selected.VRCNUM,
        ...(isAdd ? { membershipType: details.membershipType } : { notes: details.notes }),
        email: details.email,
        phone: details.phone,
        ...(overriding ? { overrideReason: details.overrideReason } : {}),
      }),
    );

  const heading = (
    <StepHeading
      step={STEPS[step].n}
      total={4}
      title={STEPS[step].title}
      focusOnMount={moved}
    />
  );
  const candidateName = candidate ? personName(candidate) || candidate.VRCNUM : "";

  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (step === "find" || !candidate) {
    body = (
      <CandidateSearchStep
        committee={action.committee}
        requireAssemblyDistrictMatch={detail.requireAssemblyDistrictMatch}
        search={search}
        onSearchChange={setSearch}
        existingMemberIds={existingMemberIds}
        committeeFull={committeeFull}
        onSelect={(c) => {
          if (c.VRCNUM !== candidate?.VRCNUM) {
            setOverride(false);
            setDetail({ overrideReason: "" });
          }
          setCandidate(c);
          goToStep("review");
        }}
      />
    );
    footer = (
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    );
  } else if (step === "review") {
    const canContinue =
      eligibility.status === "ready" && (hardStops.length === 0 || overriding);
    body = (
      <div className="space-y-3">
        <div className="text-sm">
          <p className="font-medium">{candidateName}</p>
          <p className="text-slate-600 dark:text-slate-400">
            {[`ID ${candidate.VRCNUM}`, candidateAddress(candidate)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <EligibilitySnapshotPanel
          preflight={eligibility.status === "ready" ? eligibility.preflight : null}
          loading={eligibility.status === "loading"}
          error={eligibility.status === "error" ? eligibility.error : null}
        />
        {eligibility.status === "error" && (
          <Button type="button" variant="outline" size="sm" onClick={eligibility.retry}>
            Retry eligibility check
          </Button>
        )}
        {isAdd && hardStops.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border p-3 text-sm">
            <Checkbox
              id={`${id}-override`}
              checked={override}
              onCheckedChange={(v) => setOverride(v === true)}
            />
            <Label htmlFor={`${id}-override`} className="leading-snug">
              Override these hard stops (Admin). You&apos;ll give a reason, which is
              recorded in the audit log. Some hard stops can&apos;t be overridden;
              the server decides.
            </Label>
          </div>
        )}
      </div>
    );
    footer = (
      <>
        <Button type="button" variant="outline" onClick={() => goToStep("find")}>
          Back
        </Button>
        <Button type="button" disabled={!canContinue} onClick={() => goToStep("details")}>
          Continue
        </Button>
      </>
    );
  } else if (step === "details") {
    const canContinue = !overriding || details.overrideReason.trim() !== "";
    body = (
      <div className="space-y-4">
        {isAdd && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Membership type</legend>
            {(
              [
                ["APPOINTED", "Appointed"],
                ["PETITIONED", "Petitioned"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`${id}-membership-type`}
                  value={value}
                  checked={details.membershipType === value}
                  onChange={() => setDetail({ membershipType: value })}
                />
                {label}
              </label>
            ))}
          </fieldset>
        )}
        <div className="grid gap-2">
          <ContactInfoLabel memberName={candidateName} />
          <Input
            type="email"
            placeholder="Email"
            value={details.email}
            onChange={(e) => setDetail({ email: e.target.value })}
            aria-label="Member contact email"
          />
          <Input
            type="tel"
            placeholder="Phone"
            value={details.phone}
            onChange={(e) => setDetail({ phone: e.target.value })}
            aria-label="Member contact phone"
          />
        </div>
        {!isAdd && (
          <div className="grid gap-1">
            <Label htmlFor={`${id}-notes`}>Notes for the reviewer</Label>
            <Textarea
              id={`${id}-notes`}
              rows={3}
              maxLength={NOTES_MAX}
              value={details.notes}
              onChange={(e) => setDetail({ notes: e.target.value })}
            />
          </div>
        )}
        {overriding && (
          <div className="grid gap-1">
            <Label htmlFor={`${id}-override-reason`}>Override reason (required)</Label>
            <Textarea
              id={`${id}-override-reason`}
              rows={3}
              maxLength={OVERRIDE_REASON_MAX}
              value={details.overrideReason}
              onChange={(e) => setDetail({ overrideReason: e.target.value })}
            />
          </div>
        )}
      </div>
    );
    footer = (
      <>
        <Button type="button" variant="outline" onClick={() => goToStep("review")}>
          Back
        </Button>
        <Button type="button" disabled={!canContinue} onClick={() => goToStep("confirm")}>
          Continue
        </Button>
      </>
    );
  } else {
    const contact = [details.email.trim(), details.phone.trim()].filter(Boolean).join(" · ");
    type SummaryRow = [label: string, value: string];
    const rows: SummaryRow[] = [
      ["Committee", committeeLabel(action.committee)],
      target
        ? ["Replaces", target.label]
        : [
            "Seat",
            isAdd ? "Next open seat" : "Next open seat, if the submission is accepted",
          ],
      ["Candidate", `${candidateName} (${candidate.VRCNUM})`],
    ];
    if (isAdd) {
      rows.push([
        "Membership type",
        details.membershipType === "PETITIONED" ? "Petitioned" : "Appointed",
      ]);
    }
    if (contact) rows.push(["Contact", contact]);
    if (!isAdd && details.notes.trim()) rows.push(["Notes", details.notes.trim()]);
    if (overriding) rows.push(["Override reason", details.overrideReason.trim()]);
    body = (
      <div className="space-y-3">
        <ul aria-label="Summary" className="divide-y rounded-md border text-sm">
          {rows.map(([label, value]) => (
            <li key={label} className="grid grid-cols-[8rem_1fr] gap-2 px-3 py-2">
              <span className="text-slate-500">{label}</span>
              <span className="min-w-0 break-words">{value}</span>
            </li>
          ))}
        </ul>
        {!isAdd && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            This sends the candidate to an Admin for review. They are not on the
            committee until an Admin accepts the submission.
          </p>
        )}
        {failure && (
          <OutcomeAlert
            outcome={failure}
            ineligibleTitle={isAdd ? "Cannot add member" : "Submission blocked"}
          />
        )}
      </div>
    );
    footer = (
      <>
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() => goToStep("details")}
        >
          Back
        </Button>
        <Button
          type="button"
          disabled={submitting}
          aria-busy={submitting || undefined}
          onClick={() => void submit(candidate)}
        >
          {submitting ? (isAdd ? "Adding…" : "Submitting…") : primaryLabel}
        </Button>
      </>
    );
  }

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {target && (
          <p className="text-sm">
            Replacing <span className="font-medium">{target.label}</span>
          </p>
        )}
        {heading}
        {body}
      </div>
      <DrawerFooter>{footer}</DrawerFooter>
    </>
  );
}
