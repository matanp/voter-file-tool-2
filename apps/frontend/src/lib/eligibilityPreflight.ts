import type { CommitteeGovernanceConfig } from "@prisma/client";
import {
  countActiveMembers,
  getGovernanceConfig,
} from "~/app/api/lib/committeeValidation";
import {
  validateEligibility,
  type EligibilityWarning,
  type IneligibilityReason,
  type ValidateEligibilityResult,
} from "~/lib/eligibility";
import prisma from "~/lib/prisma";

export type EligibilityWarningState = "NONE" | "HAS_WARNINGS";

export type EligibilitySnapshot = {
  voter: {
    voterRecordId: string;
    name: string;
    homeCityTown: string | null;
    homeElectionDistrict: number | null;
    homeAssemblyDistrict: string | null;
    party: string | null;
  };
  lted: {
    cityTown: string;
    legDistrict: number;
    electionDistrict: number;
  };
  committee: {
    activeMemberCount: number;
    maxSeatsPerLted: number;
  };
  warningState: EligibilityWarningState;
};

export type EligibilityPreflightResponse = {
  eligible: boolean;
  hardStops: IneligibilityReason[];
  warnings: EligibilityWarning[];
  snapshot: EligibilitySnapshot;
};

type CommitteeListLted = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
};

type VoterDisplayFields = {
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  electionDistrict: number | null;
  stateAssmblyDistrict: string | null;
  party: string | null;
};

/** Assembles the eligibility preflight snapshot from already-fetched inputs. */
export function buildEligibilitySnapshot(
  voterRecordId: string,
  committeeList: CommitteeListLted,
  voter: VoterDisplayFields | null,
  governanceConfig: CommitteeGovernanceConfig,
  activeMemberCount: number,
  result: Pick<ValidateEligibilityResult, "warnings">,
): EligibilitySnapshot {
  const voterName = [voter?.firstName, voter?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    voter: {
      voterRecordId,
      name: voterName || voterRecordId,
      homeCityTown: voter?.city ?? null,
      homeElectionDistrict: voter?.electionDistrict ?? null,
      homeAssemblyDistrict: voter?.stateAssmblyDistrict ?? null,
      party: voter?.party ?? null,
    },
    lted: {
      cityTown: committeeList.cityTown,
      legDistrict: committeeList.legDistrict,
      electionDistrict: committeeList.electionDistrict,
    },
    committee: {
      activeMemberCount,
      maxSeatsPerLted: governanceConfig.maxSeatsPerLted,
    },
    warningState: result.warnings.length > 0 ? "HAS_WARNINGS" : "NONE",
  };
}

/** Runs eligibility validation once and returns the preflight payload with snapshot. */
export async function runEligibilityPreflight(
  voterRecordId: string,
  committeeListId: number,
  activeTermId: string,
  committeeList: CommitteeListLted,
): Promise<EligibilityPreflightResponse> {
  const [governanceConfig, activeMemberCount] = await Promise.all([
    getGovernanceConfig(),
    countActiveMembers(committeeListId, activeTermId),
  ]);

  const result = await validateEligibility(
    voterRecordId,
    committeeListId,
    activeTermId,
    { prefetched: { config: governanceConfig, activeMemberCount } },
  );

  const voter = await prisma.voterRecord.findUnique({
    where: { VRCNUM: voterRecordId },
    select: {
      firstName: true,
      lastName: true,
      city: true,
      electionDistrict: true,
      stateAssmblyDistrict: true,
      party: true,
    },
  });

  return {
    eligible: result.eligible,
    hardStops: result.hardStops,
    warnings: result.warnings,
    snapshot: buildEligibilitySnapshot(
      voterRecordId,
      committeeList,
      voter,
      governanceConfig,
      activeMemberCount,
      result,
    ),
  };
}
