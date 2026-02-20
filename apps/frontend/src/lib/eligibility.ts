/**
 * SRS §2.1 — Server-side eligibility validation for committee membership.
 * Reusable utility run before committee add / requestAdd / handleRequest (accept).
 * All thresholds come from CommitteeGovernanceConfig (no hardcoded values).
 */

import type { IneligibilityReason } from "@prisma/client";
import prisma from "~/lib/prisma";
import { getGovernanceConfig } from "~/app/api/lib/committeeValidation";

export type { IneligibilityReason };

export type ValidateEligibilityOptions = {
  forceAdd?: boolean;
  overrideReason?: string;
};

export type ValidateEligibilityResult = {
  eligible: boolean;
  hardStops: IneligibilityReason[];
  warnings: string[];
  /** Set when forceAdd bypassed overridable stops; route should log to audit. */
  bypassedReasons?: IneligibilityReason[];
  /** Set when forceAdd=true but overrideReason missing despite bypasses. */
  validationError?: string;
};

/**
 * Validates eligibility for adding a voter to a committee (hard stops only).
 * Reads CommitteeGovernanceConfig for all thresholds. When forceAdd=true, overridable
 * stops are bypassed and bypassedReasons returned for audit logging; non-overridable
 * stops remain blocking.
 */
export async function validateEligibility(
  voterRecordId: string,
  committeeListId: number,
  termId: string,
  options?: ValidateEligibilityOptions,
): Promise<ValidateEligibilityResult> {
  const config = await getGovernanceConfig();
  const hardStops: IneligibilityReason[] = [];
  const warnings: string[] = [];

  // 1. NOT_REGISTERED — voter record exists
  const voter = await prisma.voterRecord.findUnique({
    where: { VRCNUM: voterRecordId },
    select: {
      VRCNUM: true,
      party: true,
      stateAssmblyDistrict: true,
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
  warnings: string[],
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
