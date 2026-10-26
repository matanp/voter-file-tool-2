/**
 * The committee residency rule: who may serve on a committee, by where they live.
 *
 * A voter may serve when their assembly district (AD) matches the committee's AD, which comes
 * from the committee's LTED in LtedDistrictCrosswalk. ED, LD and town don't matter. The check
 * only runs when CommitteeGovernanceConfig.requireAssemblyDistrictMatch is on. A committee with
 * no crosswalk row (or an empty AD) has no AD that anyone can match.
 *
 * Used by the admission gate (validateEligibility), the BOE standing audit
 * (runBoeEligibilityFlagging), the eligibility snapshot, and the "Only eligible candidates" search
 * filter. The filter runs in the browser, so this module imports only types from @prisma/client
 * and is exported on its own as @voter-file-tool/shared-prisma/committeeResidency.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

import { normalizeEligibilityText } from "./eligibilityPredicates";

type ResidencyClient = PrismaClient | Prisma.TransactionClient;

export type CommitteeLted = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
};

/** What to report when a voter fails the residency rule. Each AD is trimmed, or null if empty. */
export type AssemblyDistrictMismatch = {
  expectedAssemblyDistrict: string | null;
  voterAssemblyDistrict: string | null;
};

/** A record-search condition, in the shape SearchQueryField (shared-validators) takes. */
export type ResidencySearchField = {
  field: "stateAssmblyDistrict";
  values: string[];
};

/** Looks up a committee's AD in a batch fetched by findCommitteeAssemblyDistricts. */
export type CommitteeAssemblyDistrictLookup = (
  committee: CommitteeLted,
) => string | null;

/** Checks one voter against one committee from a batch prepared by prepareCommitteeResidencyChecks. */
export type CommitteeResidencyCheck = (
  committee: CommitteeLted,
  voterAssemblyDistrict: string | null | undefined,
) => AssemblyDistrictMismatch | null;

function ltedKey(committee: CommitteeLted): string {
  return `${committee.cityTown}::${String(committee.legDistrict)}::${String(committee.electionDistrict)}`;
}

function toAssemblyDistrict(value: string | null | undefined): string | null {
  return normalizeEligibilityText(value) || null;
}

/** The committee's AD from its LTED: trimmed, or null when there's no crosswalk row or the AD is empty. */
export async function findCommitteeAssemblyDistrict(
  db: ResidencyClient,
  committee: CommitteeLted,
): Promise<string | null> {
  const crosswalk = await db.ltedDistrictCrosswalk.findUnique({
    where: {
      cityTown_legDistrict_electionDistrict: {
        cityTown: committee.cityTown,
        legDistrict: committee.legDistrict,
        electionDistrict: committee.electionDistrict,
      },
    },
    select: { stateAssemblyDistrict: true },
  });

  return toAssemblyDistrict(crosswalk?.stateAssemblyDistrict);
}

/** Batch form of findCommitteeAssemblyDistrict: one crosswalk query for many committees. */
export async function findCommitteeAssemblyDistricts(
  db: ResidencyClient,
  committees: CommitteeLted[],
): Promise<CommitteeAssemblyDistrictLookup> {
  const uniqueLteds = new Map<string, CommitteeLted>();
  for (const committee of committees) {
    uniqueLteds.set(ltedKey(committee), {
      cityTown: committee.cityTown,
      legDistrict: committee.legDistrict,
      electionDistrict: committee.electionDistrict,
    });
  }

  const rows =
    uniqueLteds.size > 0
      ? await db.ltedDistrictCrosswalk.findMany({
          where: { OR: Array.from(uniqueLteds.values()) },
          select: {
            cityTown: true,
            legDistrict: true,
            electionDistrict: true,
            stateAssemblyDistrict: true,
          },
        })
      : [];

  const assemblyDistrictByLted = new Map<string, string | null>();
  for (const row of rows) {
    assemblyDistrictByLted.set(
      ltedKey(row),
      toAssemblyDistrict(row.stateAssemblyDistrict),
    );
  }

  return (committee) => assemblyDistrictByLted.get(ltedKey(committee)) ?? null;
}

/**
 * Checks a voter's AD against the committee's AD. Returns the mismatch details, or null when the
 * voter may serve. A missing expected AD is a mismatch. Ignores requireAssemblyDistrictMatch:
 * findResidencyMismatch and prepareCommitteeResidencyChecks honour it.
 */
export function findAssemblyDistrictMismatch(
  voterAssemblyDistrict: string | null | undefined,
  expectedAssemblyDistrict: string | null | undefined,
): AssemblyDistrictMismatch | null {
  const expected = toAssemblyDistrict(expectedAssemblyDistrict);
  const actual = toAssemblyDistrict(voterAssemblyDistrict);

  if (expected && expected === actual) {
    return null;
  }

  return {
    expectedAssemblyDistrict: expected,
    voterAssemblyDistrict: actual,
  };
}

/**
 * Checks a voter against one committee, looked up by id. Runs no queries when the check is off.
 * A missing committee is a mismatch.
 */
export async function findResidencyMismatch(
  db: ResidencyClient,
  input: {
    committeeListId: number;
    voterAssemblyDistrict: string | null | undefined;
    requireAssemblyDistrictMatch: boolean;
  },
): Promise<AssemblyDistrictMismatch | null> {
  if (!input.requireAssemblyDistrictMatch) {
    return null;
  }

  const committee = await db.committeeList.findUnique({
    where: { id: input.committeeListId },
    select: {
      cityTown: true,
      legDistrict: true,
      electionDistrict: true,
    },
  });

  const expectedAssemblyDistrict = committee
    ? await findCommitteeAssemblyDistrict(db, committee)
    : null;

  return findAssemblyDistrictMismatch(
    input.voterAssemblyDistrict,
    expectedAssemblyDistrict,
  );
}

/**
 * Prepares residency checks for many committees with one crosswalk query, or none when the check
 * is off. The returned function checks one voter against one of those committees.
 */
export async function prepareCommitteeResidencyChecks(
  db: ResidencyClient,
  committees: CommitteeLted[],
  requireAssemblyDistrictMatch: boolean,
): Promise<CommitteeResidencyCheck> {
  if (!requireAssemblyDistrictMatch) {
    return () => null;
  }

  const lookup = await findCommitteeAssemblyDistricts(db, committees);
  return (committee, voterAssemblyDistrict) =>
    findAssemblyDistrictMismatch(voterAssemblyDistrict, lookup(committee));
}

/**
 * The "Only eligible candidates" search filter: voters whose AD is the committee's AD. Empty when
 * requireAssemblyDistrictMatch is off, because the gates then don't check residency. Null when the
 * check is on but the committee has no AD: nobody can pass it, so there is nothing to search for.
 */
export function committeeResidencySearchFilter(
  committeeAssemblyDistrict: string | null | undefined,
  requireAssemblyDistrictMatch: boolean,
): ResidencySearchField[] | null {
  if (!requireAssemblyDistrictMatch) {
    return [];
  }

  const expected = toAssemblyDistrict(committeeAssemblyDistrict);
  return expected
    ? [{ field: "stateAssmblyDistrict", values: [expected] }]
    : null;
}
