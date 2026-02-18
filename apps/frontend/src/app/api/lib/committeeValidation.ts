/**
 * Committee membership validation helpers (SRS §7.1).
 */

import prisma from "~/lib/prisma";
import type {
  CommitteeGovernanceConfig,
  CommitteeTerm,
} from "@prisma/client";

// SRS 1.2 — MembershipStatus.ACTIVE constant for CommitteeMembership queries
const ACTIVE_STATUS = "ACTIVE";

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
 * @deprecated Use isVoterActiveInAnotherCommittee() for new CommitteeMembership-based checks.
 */
export function isVoterInAnotherCommittee(
  voterCommitteeId: number | null,
  targetCommitteeId: number | null,
): boolean {
  return voterCommitteeId != null && voterCommitteeId !== targetCommitteeId;
}

/**
 * SRS §7.1 — Checks CommitteeMembership table for an ACTIVE membership in a
 * different committee for the given term.
 * Returns true if the voter is ACTIVE in another committee (hard stop).
 */
export async function isVoterActiveInAnotherCommittee(
  voterRecordId: string,
  targetCommitteeListId: number,
  termId: string,
): Promise<boolean> {
  const existing = await prisma.committeeMembership.findFirst({
    where: {
      voterRecordId,
      termId,
      status: ACTIVE_STATUS,
      NOT: { committeeListId: targetCommitteeListId },
    },
    select: { id: true },
  });
  return existing !== null;
}

/**
 * Counts active memberships for a committee+term (for capacity enforcement).
 */
export async function countActiveMembers(
  committeeListId: number,
  termId: string,
): Promise<number> {
  return prisma.committeeMembership.count({
    where: { committeeListId, termId, status: ACTIVE_STATUS },
  });
}
