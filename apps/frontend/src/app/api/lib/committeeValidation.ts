/**
 * Committee membership validation helpers (SRS §7.1).
 */

import prisma from "~/lib/prisma";
import { PrivilegeLevel } from "@prisma/client";
import type { ErrorResponse } from "@voter-file-tool/shared-validators";
import type {
  CommitteeGovernanceConfig,
  CommitteeTerm,
  UserJurisdiction,
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

/**
 * SRS 3.1 — Returns jurisdictions for a user in a term, or null if no scope restriction.
 * Admin/Developer: null (no restriction). Leader: UserJurisdiction[] for that user+term.
 */
export async function getUserJurisdictions(
  userId: string,
  termId: string,
  privilegeLevel: PrivilegeLevel,
): Promise<UserJurisdiction[] | null> {
  if (
    privilegeLevel === PrivilegeLevel.Admin ||
    privilegeLevel === PrivilegeLevel.Developer
  ) {
    return null;
  }
  return prisma.userJurisdiction.findMany({
    where: { userId, termId },
  });
}

/** Minimal shape used for jurisdiction scope matching (cityTown + legDistrict). */
export type JurisdictionScope = Pick<UserJurisdiction, "cityTown" | "legDistrict">;

/**
 * SRS 3.1 — Returns true if (cityTown, legDistrict) is allowed by the given jurisdictions.
 * legDistrict in list: null means "all districts" for that cityTown.
 */
export function committeeMatchesJurisdictions(
  cityTown: string,
  legDistrict: number,
  jurisdictions: JurisdictionScope[],
): boolean {
  return jurisdictions.some(
    (j) =>
      j.cityTown === cityTown &&
      (j.legDistrict === null || j.legDistrict === legDistrict),
  );
}

/** Shape required for jurisdiction-scoped report validation (signInSheet, designationWeightSummary). */
export interface ReportJurisdictionInput {
  scope: "jurisdiction" | "countywide";
  cityTown?: string;
  legDistrict?: number;
}

/**
 * SRS 3.2, 3.3 — Validates jurisdiction access for scoped reports (sign-in sheet, designation weight summary).
 * Returns null if validation passes; returns ErrorResponse if access is denied.
 */
export async function validateReportJurisdictionAccess(
  input: ReportJurisdictionInput,
  userId: string,
  privilegeLevel: PrivilegeLevel,
  reportLabel: string,
  hasPermissionFor: (
    user: PrivilegeLevel,
    required: PrivilegeLevel,
  ) => boolean,
): Promise<ErrorResponse | null> {
  const isAdmin = hasPermissionFor(privilegeLevel, PrivilegeLevel.Admin);

  if (input.scope === "countywide" && !isAdmin) {
    return {
      error: `Leaders cannot generate countywide ${reportLabel}`,
    };
  }

  if (
    input.scope === "jurisdiction" &&
    !isAdmin &&
    input.cityTown
  ) {
    const activeTermId = await getActiveTermId();
    const jurisdictions = await getUserJurisdictions(
      userId,
      activeTermId,
      privilegeLevel,
    );
    if (Array.isArray(jurisdictions) && jurisdictions.length > 0) {
      const allowed = committeeMatchesJurisdictions(
        input.cityTown,
        input.legDistrict ?? 0,
        jurisdictions,
      );
      if (!allowed) {
        return {
          error: "You do not have access to the requested jurisdiction",
        };
      }
    } else {
      return {
        error: "No jurisdictions assigned",
      };
    }
  }

  return null;
}
