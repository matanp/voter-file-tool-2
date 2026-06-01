import type { EligibilityWarning, IneligibilityReason } from "~/lib/eligibility";

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
