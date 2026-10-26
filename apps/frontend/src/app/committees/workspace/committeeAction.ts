import type { CommitteeDetailResponse } from "~/lib/validations/committee";

/**
 * The committee an action targets: `committeeListId` plus the composite key
 * the mutation endpoints use (plan §3.11, §8).
 */
export type CommitteeRef = {
  committeeListId: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
};

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
 * - `view-voter-details`: read-only; shows the occupant's voter record.
 */
export type CommitteeAction =
  | { kind: "add-member"; committee: CandidateCommitteeRef; seatNumber?: number }
  | { kind: "replace-member"; committee: CandidateCommitteeRef; memberId: string }
  | { kind: "remove-member"; committee: CommitteeRef; memberId: string }
  | { kind: "record-resignation"; committee: CommitteeRef; memberId: string }
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

/**
 * Towns without legislative districts carry the sentinel (-1) as their LD in
 * read models; endpoints want it omitted and labels leave it out.
 */
export function hasLegDistrict(committee: Pick<CommitteeRef, "legDistrict">): boolean {
  return committee.legDistrict > 0;
}

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
