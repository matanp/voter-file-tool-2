import type { CommitteeRef } from "~/lib/committees/committeeRef";
import type { CommitteeDetailResponse } from "~/lib/validations/committee";

/** Candidate search additionally needs the committee's residency context. */
export type CandidateCommitteeRef = CommitteeRef & {
  /** From the LTED crosswalk; null when the committee's ED has no entry. */
  assemblyDistrict: string | null;
};

/**
 * What the workspace asks the action drawer to do (plan §8). `memberId` is the
 * occupant's VRCNUM, which `/api/committee/remove` and `requestAdd`'s
 * replacement target key on today.
 *
 * - `add-member`: Admin adds directly; Leader/RequestAccess submit a candidate.
 * - `replace-member`: the add flow with the occupant as the replacement
 *   target, submitted through `requestAdd`. Not offered to Admin until an
 *   atomic replace command exists (plan §8 "Replacement in v1").
 * - `remove-member`, `record-resignation`: Admin only (ticket 14).
 * - `report-exit`: Leader/RequestAccess report that the occupant resigned or
 *   should be removed, for Admin review (leader-feedback-2026-11 ticket 01).
 * - `view-voter-details`: read-only; shows the occupant's voter record.
 */
export type CommitteeAction =
  | { kind: "add-member"; committee: CandidateCommitteeRef; seatNumber?: number }
  | { kind: "replace-member"; committee: CandidateCommitteeRef; memberId: string }
  | { kind: "remove-member"; committee: CommitteeRef; memberId: string }
  | { kind: "record-resignation"; committee: CommitteeRef; memberId: string }
  | { kind: "report-exit"; committee: CommitteeRef; memberId: string }
  | { kind: "view-voter-details"; committee: CommitteeRef; memberId: string };

export type CommitteeActionKind = CommitteeAction["kind"];

/**
 * Dispatches an action. `returnFocusTo` is the control the action came from
 * (a row's menu trigger); the drawer puts focus back on it when it closes.
 */
export type CommitteeActionHandler = (
  action: CommitteeAction,
  returnFocusTo?: HTMLElement | null,
) => void;

export function committeeRefFrom(
  committee: CommitteeDetailResponse["committee"],
): CandidateCommitteeRef {
  return {
    committeeListId: committee.committeeListId,
    cityTown: committee.cityTown,
    legDistrict: committee.legDistrict,
    electionDistrict: committee.electionDistrict,
    assemblyDistrict: committee.assemblyDistrict,
  };
}
