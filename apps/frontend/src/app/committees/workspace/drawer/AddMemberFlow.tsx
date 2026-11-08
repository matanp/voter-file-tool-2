"use client";
/**
 * The add-member / replace-member flow (plan §8): four steps in one drawer
 * (five for a replacement).
 *
 * 1. Find candidate. 2. Review: identity, server hard stops and warnings,
 * seats (an Admin may override hard stops, with a reason, where the server
 * permits it). 3. Membership details. 4. Replace only: why the member being
 * replaced is leaving, an Exit Report paired with the candidate's Submission
 * (ticket 09); if they already have a pending report, the replacement pairs
 * with it, as it is or updated. 5. Confirm: explicit destination and the
 * role's primary action (**Add member** / **Submit candidate**). A replacement
 * shows the Exit Report instructions before it is sent.
 *
 * Eligibility is server-decided throughout: the preflight shows what the
 * server would say, and the mutation endpoint has the final word (its hard
 * stops come back into the confirm step, and the drawer stays open).
 */
import React, { useEffect, useId, useMemo, useState } from "react";
import type { MembershipType } from "@prisma/client";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioOption } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";
import type { CommitteeDetailResponse } from "~/lib/validations/committee";
import ContactInfoLabel from "../../ContactInfoLabel";
import EligibilitySnapshotPanel from "../../EligibilitySnapshotPanel";
import { formatInstantDateForDisplay } from "~/lib/dateUtils";
import {
  exitReportProblems,
  prefetchExitInstructions,
  submitCandidate,
  type CandidateAction,
  type CandidateRecord,
  type CandidateSubmissionMode,
  type ExitReportInput,
  type ReplacementExit,
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
import {
  EMPTY_EXIT_REPORT,
  ExitInstructionsDialog,
  ExitReportFields,
} from "./ExitReportForms";

type Step = "find" | "review" | "details" | "exit" | "confirm";
const STEP_TITLES: Record<Step, string> = {
  find: "Find candidate",
  review: "Review candidate",
  details: "Membership details",
  exit: "Why they're leaving",
  confirm: "Confirm",
};

const EXIT_KIND_LABELS = {
  RESIGNATION: "Resigned",
  REMOVAL: "Should be removed",
} as const;

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
  const isReplace = action.kind === "replace-member";
  const steps: Step[] = isReplace
    ? ["find", "review", "details", "exit", "confirm"]
    : ["find", "review", "details", "confirm"];
  // A pending report on the member being replaced: the replacement pairs with
  // it instead of filing a second one.
  const existingReport = isReplace
    ? (detail.pendingExitReports.find((r) => r.voterRecordId === action.memberId) ?? null)
    : null;
  const [exitInput, setExitInput] = useState<ExitReportInput>(EMPTY_EXIT_REPORT);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [confirmingExit, setConfirmingExit] = useState(false);
  useEffect(() => {
    if (isReplace) prefetchExitInstructions();
  }, [isReplace]);
  const replacementExit: ReplacementExit | undefined = !isReplace
    ? undefined
    : existingReport === null
      ? { kind: "new", input: exitInput }
      : updateExisting
        ? { kind: "update", reportedAt: existingReport.reportedAt, input: exitInput }
        : { kind: "keep", reportedAt: existingReport.reportedAt };
  const exitProblems =
    replacementExit === undefined || replacementExit.kind === "keep"
      ? []
      : exitReportProblems(exitInput);
  const setExitField = (patch: Partial<ExitReportInput>) =>
    setExitInput((prev) => ({ ...prev, ...patch }));

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
        ...(replacementExit ? { replacementExit } : {}),
      }),
    );

  const heading = (
    <StepHeading
      step={steps.indexOf(step) + 1}
      total={steps.length}
      title={STEP_TITLES[step]}
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
          <div className="grid gap-2">
            <Label id={`${id}-membership-type`}>Membership type</Label>
            <RadioGroup
              aria-labelledby={`${id}-membership-type`}
              value={details.membershipType}
              onValueChange={(membershipType) =>
                setDetail({ membershipType: membershipType as MembershipType })
              }
            >
              {(
                [
                  ["APPOINTED", "Appointed"],
                  ["PETITIONED", "Petitioned"],
                ] as const
              ).map(([value, label]) => (
                <RadioOption
                  key={value}
                  id={`${id}-membership-type-${value}`}
                  value={value}
                  label={label}
                />
              ))}
            </RadioGroup>
          </div>
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
        <Button
          type="button"
          disabled={!canContinue}
          onClick={() => goToStep(isReplace ? "exit" : "confirm")}
        >
          Continue
        </Button>
      </>
    );
  } else if (step === "exit") {
    const pairedElsewhere = existingReport?.replacement ?? null;
    body = (
      <div className="space-y-4">
        {pairedElsewhere ? (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {target?.name ?? "This member"} is already being replaced by{" "}
            {personName(pairedElsewhere) || pairedElsewhere.voterRecordId}, who is
            waiting for Admin review. Only one replacement can be pending.
          </p>
        ) : existingReport ? (
          <>
            <p className="text-sm">
              {existingReport.isOwnReport ? "You" : "A Leader"} already reported{" "}
              {existingReport.kind === "RESIGNATION" ? "the resignation" : "the removal"} of{" "}
              <span className="font-medium">{target?.name}</span> on{" "}
              {formatInstantDateForDisplay(existingReport.reportedAt)}. The replacement
              uses that report; it isn&apos;t filed twice.
            </p>
            <div className="flex items-start gap-2 rounded-md border p-3 text-sm">
              <Checkbox
                id={`${id}-update-exit`}
                checked={updateExisting}
                onCheckedChange={(v) => setUpdateExisting(v === true)}
              />
              <Label htmlFor={`${id}-update-exit`} className="leading-snug">
                Update the report. Everything it says is replaced by what you
                enter here.
              </Label>
            </div>
            {updateExisting && <ExitReportFields value={exitInput} onChange={setExitField} />}
          </>
        ) : (
          <>
            <p className="text-sm">
              Why is <span className="font-medium">{target?.name}</span> leaving? An
              Admin reviews this with the candidate; until then they stay on the
              committee.
            </p>
            <ExitReportFields value={exitInput} onChange={setExitField} />
          </>
        )}
        {!pairedElsewhere && exitProblems.length > 0 && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <p>To continue:</p>
            <ul className="list-inside list-disc">
              {exitProblems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
    footer = (
      <>
        <Button type="button" variant="outline" onClick={() => goToStep("details")}>
          Back
        </Button>
        <Button
          type="button"
          disabled={pairedElsewhere !== null || exitProblems.length > 0}
          onClick={() => goToStep("confirm")}
        >
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
    if (replacementExit) {
      const kind =
        replacementExit.kind === "keep"
          ? existingReport?.kind
          : replacementExit.input.kind || undefined;
      rows.push([
        "Leaving",
        `${kind ? EXIT_KIND_LABELS[kind] : ""}${
          replacementExit.kind === "keep"
            ? " (as already reported)"
            : replacementExit.kind === "update"
              ? " (updates the earlier report)"
              : ""
        }`,
      ]);
    }
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
            {isReplace &&
              ` ${target?.name ?? "The member being replaced"} stays on the committee until then.`}
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
          onClick={() =>
            isReplace ? setConfirmingExit(true) : void submit(candidate)
          }
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
      {isReplace && (
        <ExitInstructionsDialog
          open={confirmingExit}
          onCancel={() => setConfirmingExit(false)}
          onContinue={() => {
            setConfirmingExit(false);
            if (candidate) void submit(candidate);
          }}
          continueLabel="I understand, submit replacement"
        />
      )}
    </>
  );
}
