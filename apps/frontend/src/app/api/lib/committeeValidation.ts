/**
 * Committee membership validation helpers (SRS §7.1).
 */

import prisma from "~/lib/prisma";

/** Error message for "already in another committee" hard stop */
export const ALREADY_IN_ANOTHER_COMMITTEE_ERROR =
  "Member is already in another committee";

/**
 * Fetch the singleton CommitteeGovernanceConfig row.
 * Throws if no config exists (run seed to create it).
 */
export async function getGovernanceConfig() {
  const config = await prisma.committeeGovernanceConfig.findFirst();
  if (!config) throw new Error("CommitteeGovernanceConfig not found — run seed");
  return config;
}

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
