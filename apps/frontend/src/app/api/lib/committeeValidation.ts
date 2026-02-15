/**
 * Committee membership validation helpers (SRS §7.1).
 */

/** Error message for "already in another committee" hard stop */
export const ALREADY_IN_ANOTHER_COMMITTEE_ERROR =
  "Member is already in another committee";

/**
 * Returns true if voter is in another committee (not the target).
 * Used for SRS §7.1 hard stop: "Individual is already an active committee member in another LTED"
 */
export function isVoterInAnotherCommittee(
  voterCommitteeId: number | null,
  targetCommitteeId: number | null,
): boolean {
  return voterCommitteeId != null && voterCommitteeId !== targetCommitteeId;
}
