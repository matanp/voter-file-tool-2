/**
 * SRS §2.1 + §2.2 — Server-side eligibility validation for committee membership.
 * Reusable utility run before committee add / requestAdd / handleRequest (accept).
 * Hard-stop thresholds come from CommitteeGovernanceConfig. Warnings are non-blocking;
 * see docs/SRS/tickets/2.2-warning-system.md and SRS_IMPLEMENTATION_INACTIVE_VOTER_WARNING.md.
 */

import type { IneligibilityReason } from "@prisma/client";
import prisma from "~/lib/prisma";
import { getGovernanceConfig } from "~/app/api/lib/committeeValidation";
import {
  getMostRecentImportVersion,
  isVoterPossiblyInactive,
} from "~/app/api/lib/eligibilityService";

export type { IneligibilityReason };

/** SRS §2.2 — Typed warning codes. Frontend only renders server-returned warnings. */
export type EligibilityWarningCode =
  | "POSSIBLY_INACTIVE"
  | "RECENT_RESIGNATION"
  | "PENDING_IN_ANOTHER_COMMITTEE";

export interface EligibilityWarning {
  code: EligibilityWarningCode;
  message: string;
  metadata?: Record<string, unknown>;
}

export type ValidateEligibilityOptions = {
  forceAdd?: boolean;
  overrideReason?: string;
};

export type ValidateEligibilityResult = {
  eligible: boolean;
  hardStops: IneligibilityReason[];
  warnings: EligibilityWarning[];
  /** Set when forceAdd bypassed overridable stops; route should log to audit. */
  bypassedReasons?: IneligibilityReason[];
  /** Set when forceAdd=true but overrideReason missing despite bypasses. */
  validationError?: string;
};

/** Rolling window in days for RECENT_RESIGNATION warning. TODO: move to config if needed. */
const RECENT_RESIGNATION_DAYS = 90;

/**
 * Validates eligibility for adding a voter to a committee (hard stops + non-blocking warnings).
 * Reads CommitteeGovernanceConfig for thresholds. Warnings never set eligible to false.
 * When forceAdd=true, overridable stops are bypassed and bypassedReasons returned for audit logging.
 */
export async function validateEligibility(
  voterRecordId: string,
  committeeListId: number,
  termId: string,
  options?: ValidateEligibilityOptions,
): Promise<ValidateEligibilityResult> {
  const config = await getGovernanceConfig();
  const hardStops: IneligibilityReason[] = [];
  const warnings: EligibilityWarning[] = [];

  // 1. NOT_REGISTERED — voter record exists (select includes fields needed for POSSIBLY_INACTIVE)
  const voter = await prisma.voterRecord.findUnique({
    where: { VRCNUM: voterRecordId },
    select: {
      VRCNUM: true,
      party: true,
      stateAssmblyDistrict: true,
      latestRecordEntryYear: true,
      latestRecordEntryNumber: true,
    },
  });

  if (!voter) {
    hardStops.push("NOT_REGISTERED");
    return resolveOverrideResult(
      hardStops,
      warnings,
      config.nonOverridableIneligibilityReasons,
      options,
    );
  }

  // SRS §2.2 — Warning derivation. Most-recent-import query runs once per request (see 2.2 Implementation Notes).
  const mostRecentImport = await getMostRecentImportVersion(prisma);
  if (
    mostRecentImport &&
    isVoterPossiblyInactive(
      {
        latestRecordEntryYear: voter.latestRecordEntryYear,
        latestRecordEntryNumber: voter.latestRecordEntryNumber,
      },
      mostRecentImport,
    )
  ) {
    warnings.push({
      code: "POSSIBLY_INACTIVE",
      message:
        "Voter does not appear in the most recent voter file import; registration may be inactive.",
    });
  }

  // RECENT_RESIGNATION — voter has RESIGNED membership with resignedAt within rolling window
  const resignationCutoff = new Date();
  resignationCutoff.setDate(resignationCutoff.getDate() - RECENT_RESIGNATION_DAYS);
  const recentResignation = await prisma.committeeMembership.findFirst({
    where: {
      voterRecordId,
      status: "RESIGNED",
      resignedAt: { gte: resignationCutoff },
    },
    select: { id: true },
  });
  if (recentResignation) {
    warnings.push({
      code: "RECENT_RESIGNATION",
      message: `Voter resigned from a committee within the last ${RECENT_RESIGNATION_DAYS} days.`,
    });
  }

  // PENDING_IN_ANOTHER_COMMITTEE — voter has SUBMITTED membership in another committee for same term
  const pendingInOther = await prisma.committeeMembership.findFirst({
    where: {
      voterRecordId,
      termId,
      status: "SUBMITTED",
      NOT: { committeeListId },
    },
    select: { id: true },
  });
  if (pendingInOther) {
    warnings.push({
      code: "PENDING_IN_ANOTHER_COMMITTEE",
      message:
        "Voter has a pending submission in another committee for this term.",
    });
  }

  // 2. PARTY_MISMATCH
  if ((voter.party ?? "").trim() !== (config.requiredPartyCode ?? "").trim()) {
    hardStops.push("PARTY_MISMATCH");
  }

  // 3. ASSEMBLY_DISTRICT_MISMATCH — only when requireAssemblyDistrictMatch
  // If LtedDistrictCrosswalk is empty (crosswalk not yet loaded), lookup fails for all LTEDs;
  // we treat missing crosswalk as mismatch (hard stop). See ticket 2.1 implementation notes.
  if (config.requireAssemblyDistrictMatch) {
    const committeeList = await prisma.committeeList.findUnique({
      where: { id: committeeListId },
      select: {
        cityTown: true,
        legDistrict: true,
        electionDistrict: true,
      },
    });

    if (!committeeList) {
      hardStops.push("ASSEMBLY_DISTRICT_MISMATCH");
    } else {
      const crosswalk = await prisma.ltedDistrictCrosswalk.findUnique({
        where: {
          cityTown_legDistrict_electionDistrict: {
            cityTown: committeeList.cityTown,
            legDistrict: Number(committeeList.legDistrict),
            electionDistrict: committeeList.electionDistrict,
          },
        },
        select: { stateAssemblyDistrict: true },
      });

      const voterAd = (voter.stateAssmblyDistrict ?? "").toString().trim();
      const ltedAd =
        crosswalk?.stateAssemblyDistrict?.toString().trim() ?? "";

      if (!crosswalk || voterAd !== ltedAd) {
        hardStops.push("ASSEMBLY_DISTRICT_MISMATCH");
      }
    }
  }

  // 4. CAPACITY
  const activeCount = await prisma.committeeMembership.count({
    where: {
      committeeListId,
      termId,
      status: "ACTIVE",
    },
  });
  if (activeCount >= config.maxSeatsPerLted) {
    hardStops.push("CAPACITY");
  }

  // 5. ALREADY_IN_ANOTHER_COMMITTEE
  const activeInOther = await prisma.committeeMembership.findFirst({
    where: {
      voterRecordId,
      termId,
      status: "ACTIVE",
      NOT: { committeeListId },
    },
    select: { id: true },
  });
  if (activeInOther) {
    hardStops.push("ALREADY_IN_ANOTHER_COMMITTEE");
  }

  return resolveOverrideResult(
    hardStops,
    warnings,
    config.nonOverridableIneligibilityReasons,
    options,
  );
}

function resolveOverrideResult(
  hardStops: IneligibilityReason[],
  warnings: EligibilityWarning[],
  nonOverridable: IneligibilityReason[],
  options?: ValidateEligibilityOptions,
): ValidateEligibilityResult {
  const forceAdd = options?.forceAdd === true;
  const overrideReason = (options?.overrideReason ?? "").trim();

  if (hardStops.length === 0) {
    return { eligible: true, hardStops: [], warnings };
  }

  if (!forceAdd) {
    return { eligible: false, hardStops, warnings };
  }

  const overridableStops = hardStops.filter(
    (r) => !nonOverridable.includes(r),
  );
  const nonOverridableHit = hardStops.filter((r) =>
    nonOverridable.includes(r),
  );

  if (nonOverridableHit.length > 0) {
    return { eligible: false, hardStops, warnings };
  }

  if (overridableStops.length > 0 && !overrideReason) {
    return {
      eligible: false,
      hardStops,
      warnings,
      validationError:
        "overrideReason is required when forceAdd is true and eligibility checks are bypassed",
    };
  }

  return {
    eligible: true,
    hardStops: [],
    warnings,
    bypassedReasons: overridableStops,
  };
}
