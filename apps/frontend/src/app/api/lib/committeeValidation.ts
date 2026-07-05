/**
 * Committee membership validation helpers (SRS §7.1).
 */

import prisma from "~/lib/prisma";
import { PrivilegeLevel, Prisma } from "@prisma/client";
import type { ErrorResponse } from "@voter-file-tool/shared-validators";
import type {
  CommitteeGovernanceConfig,
  CommitteeTerm,
  UserJurisdiction,
} from "@prisma/client";

/** Error message for "already in another committee" hard stop */
export const ALREADY_IN_ANOTHER_COMMITTEE_ERROR =
  "Member is already in another committee";

/** True when P2002 is from the one-active-membership-per-term partial unique index. */
export function isActiveMembershipPerTermConflict(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }
  const target = error.meta?.target;
  if (!Array.isArray(target)) {
    return false;
  }
  // Existing @@unique is [voterRecordId, committeeListId, termId]
  return (
    target.includes("voterRecordId") &&
    target.includes("termId") &&
    !target.includes("committeeListId")
  );
}

/**
 * Fetch the singleton CommitteeGovernanceConfig row.
 * Throws if no config exists (run seed to create it).
 */
export async function getGovernanceConfig(): Promise<CommitteeGovernanceConfig> {
  const config: CommitteeGovernanceConfig | null =
    await prisma.committeeGovernanceConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });
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

/** cityTown + legDistrict + termId for CommitteeList existence checks. */
export type JurisdictionPairInput = {
  cityTown: string;
  legDistrict: number | null;
  termId: string;
};

/** Formats a user-facing error when no CommitteeList row matches the scope. */
export function formatJurisdictionNotFoundMessage(
  input: Pick<JurisdictionPairInput, "cityTown" | "legDistrict">,
  termLabel: "active term" | "this term" = "this term",
): string {
  const scope =
    input.legDistrict != null
      ? `${input.cityTown} LD ${input.legDistrict}`
      : `${input.cityTown} (all districts)`;
  return `No committee found for ${scope} in the ${termLabel}`;
}

/**
 * Returns true when the jurisdiction scope matches at least one CommitteeList
 * row for the term. legDistrict null means "all districts" — any row in that
 * cityTown for the term satisfies the check.
 */
export async function jurisdictionExistsInCommitteeList(
  input: JurisdictionPairInput,
): Promise<boolean> {
  const where =
    input.legDistrict === null
      ? { cityTown: input.cityTown, termId: input.termId }
      : {
          cityTown: input.cityTown,
          legDistrict: input.legDistrict,
          termId: input.termId,
        };
  const row = await prisma.committeeList.findFirst({
    where,
    select: { id: true },
  });
  return row !== null;
}

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

/**
 * SRS 3.1 — DB filter counterpart of committeeMatchesJurisdictions, for use in
 * CommitteeList queries (e.g. the roster route). Builds an OR of jurisdiction
 * scopes: an entry with legDistrict === null matches any district in that town;
 * a specific legDistrict matches only that district.
 *
 * An empty jurisdictions list yields `{ OR: [] }`, which matches nothing — the
 * correct empty result for a Leader with no assignments.
 */
export function buildJurisdictionWhere(
  jurisdictions: JurisdictionScope[],
): Prisma.CommitteeListWhereInput {
  return {
    OR: jurisdictions.map((j) => ({
      cityTown: j.cityTown,
      ...(j.legDistrict !== null ? { legDistrict: j.legDistrict } : {}),
    })),
  };
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
