/**
 * Committee membership validation helpers (SRS §7.1).
 */

import prisma from "~/lib/prisma";
import type {
  CommitteeGovernanceConfig,
  CommitteeTerm,
} from "@prisma/client";

/** Error message for "already in another committee" hard stop */
export const ALREADY_IN_ANOTHER_COMMITTEE_ERROR =
  "Member is already in another committee";

/**
 * Fetch the singleton CommitteeGovernanceConfig row.
 * Throws if no config exists (run seed to create it).
 */
export async function getGovernanceConfig(): Promise<CommitteeGovernanceConfig> {
  const config: CommitteeGovernanceConfig | null =
    await prisma.committeeGovernanceConfig.findFirst();
  if (!config) throw new Error("CommitteeGovernanceConfig not found — run seed");
  return config;
}

/**
 * Fetch the active CommitteeTerm (SRS §5.1).
 * Throws if no active term exists.
 */
export async function getActiveTerm(): Promise<CommitteeTerm> {
  const term: CommitteeTerm | null = await prisma.committeeTerm.findFirst({
    where: { isActive: true },
  });
  if (!term) throw new Error("No active CommitteeTerm — create one in Admin > Terms");
  return term;
}

/** Returns the active term ID for use in committee queries. */
export async function getActiveTermId(): Promise<string> {
  const term: CommitteeTerm = await getActiveTerm();
  return term.id;
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
