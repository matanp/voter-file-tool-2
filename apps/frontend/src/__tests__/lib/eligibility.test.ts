/**
 * Unit tests for validateEligibility (SRS §2.1).
 */

import type { IneligibilityReason } from "@prisma/client";
import { validateEligibility } from "~/lib/eligibility";
import { prismaMock } from "../utils/mocks";
import {
  createMockGovernanceConfig,
  createMockVoterRecord,
  createMockCommittee,
  DEFAULT_ACTIVE_TERM_ID,
  getMembershipMock,
} from "../utils/testUtils";

function setupGovernanceConfig(overrides: {
  requireAssemblyDistrictMatch?: boolean;
  maxSeatsPerLted?: number;
  nonOverridableIneligibilityReasons?: IneligibilityReason[];
} = {}) {
  prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
    createMockGovernanceConfig(overrides),
  );
}

function setupVoter(
  overrides: {
    party?: string;
    stateAssmblyDistrict?: string | null;
    latestRecordEntryYear?: number;
    latestRecordEntryNumber?: number;
  } = {},
) {
  prismaMock.voterRecord.findUnique.mockResolvedValue(
    createMockVoterRecord(overrides) as never,
  );
}

function setupNoVoter() {
  prismaMock.voterRecord.findUnique.mockResolvedValue(null);
}

function setupCommitteeList(overrides: { cityTown?: string; legDistrict?: number; electionDistrict?: number } = {}) {
  const committee = createMockCommittee(overrides) as { id: number; cityTown: string; legDistrict: number; electionDistrict: number };
  prismaMock.committeeList.findUnique.mockResolvedValue({
    cityTown: committee.cityTown,
    legDistrict: committee.legDistrict,
    electionDistrict: committee.electionDistrict,
  } as never);
}

function setupCrosswalk(stateAssemblyDistrict: string) {
  prismaMock.ltedDistrictCrosswalk.findUnique.mockResolvedValue({
    stateAssemblyDistrict,
  } as never);
}

function setupNoCrosswalk() {
  prismaMock.ltedDistrictCrosswalk.findUnique.mockResolvedValue(null);
}

describe("validateEligibility", () => {
  const committeeListId = 1;
  const termId = DEFAULT_ACTIVE_TERM_ID;
  const voterId = "TEST123456";

  beforeEach(() => {
    jest.clearAllMocks();
    setupGovernanceConfig();
  });

  describe("NOT_REGISTERED", () => {
    it("returns NOT_REGISTERED when voter record does not exist", async () => {
      setupNoVoter();

      const result = await validateEligibility(voterId, committeeListId, termId);

      expect(result.eligible).toBe(false);
      expect(result.hardStops).toEqual(["NOT_REGISTERED"]);
    });
  });

  describe("PARTY_MISMATCH", () => {
    it("returns PARTY_MISMATCH when voter party does not match config", async () => {
      setupVoter({ party: "REP" });
      setupCommitteeList();
      setupCrosswalk("1");
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);

      const result = await validateEligibility(voterId, committeeListId, termId);

      expect(result.eligible).toBe(false);
      expect(result.hardStops).toContain("PARTY_MISMATCH");
    });
  });

  describe("ASSEMBLY_DISTRICT_MISMATCH", () => {
    it("returns ASSEMBLY_DISTRICT_MISMATCH when crosswalk AD does not match voter AD", async () => {
      setupVoter({ party: "DEM", stateAssmblyDistrict: "2" });
      setupCommitteeList();
      setupCrosswalk("1");
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);

      const result = await validateEligibility(voterId, committeeListId, termId);

      expect(result.eligible).toBe(false);
      expect(result.hardStops).toContain("ASSEMBLY_DISTRICT_MISMATCH");
    });

    it("returns ASSEMBLY_DISTRICT_MISMATCH when crosswalk entry is missing", async () => {
      setupVoter({ party: "DEM", stateAssmblyDistrict: "1" });
      setupCommitteeList();
      setupNoCrosswalk();
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);

      const result = await validateEligibility(voterId, committeeListId, termId);

      expect(result.eligible).toBe(false);
      expect(result.hardStops).toContain("ASSEMBLY_DISTRICT_MISMATCH");
    });

    it("does not add ASSEMBLY_DISTRICT_MISMATCH when requireAssemblyDistrictMatch is false", async () => {
      setupGovernanceConfig({ requireAssemblyDistrictMatch: false });
      setupVoter({ party: "DEM" });
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);

      const result = await validateEligibility(voterId, committeeListId, termId);

      expect(result.eligible).toBe(true);
      expect(result.hardStops).not.toContain("ASSEMBLY_DISTRICT_MISMATCH");
      expect(prismaMock.committeeList.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.ltedDistrictCrosswalk.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("CAPACITY", () => {
    it("returns CAPACITY when committee is at max seats (4 active)", async () => {
      setupVoter({ party: "DEM", stateAssmblyDistrict: "1" });
      setupCommitteeList();
      setupCrosswalk("1");
      getMembershipMock(prismaMock).count.mockResolvedValue(4);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);

      const result = await validateEligibility(voterId, committeeListId, termId);

      expect(result.eligible).toBe(false);
      expect(result.hardStops).toContain("CAPACITY");
    });
  });

  describe("ALREADY_IN_ANOTHER_COMMITTEE", () => {
    it("returns ALREADY_IN_ANOTHER_COMMITTEE when voter is ACTIVE in another committee", async () => {
      setupVoter({ party: "DEM", stateAssmblyDistrict: "1" });
      setupCommitteeList();
      setupCrosswalk("1");
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue({
        id: "other-membership-id",
      } as never);

      const result = await validateEligibility(voterId, committeeListId, termId);

      expect(result.eligible).toBe(false);
      expect(result.hardStops).toContain("ALREADY_IN_ANOTHER_COMMITTEE");
    });
  });

  describe("all checks pass", () => {
    it("returns eligible true and empty hardStops when all checks pass", async () => {
      setupVoter({ party: "DEM", stateAssmblyDistrict: "1" });
      setupCommitteeList();
      setupCrosswalk("1");
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      (prismaMock.voterRecord.findFirst as jest.Mock)?.mockResolvedValue?.({
        latestRecordEntryYear: 2024,
        latestRecordEntryNumber: 1,
      });

      const result = await validateEligibility(voterId, committeeListId, termId);

      expect(result.eligible).toBe(true);
      expect(result.hardStops).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe("SRS §2.2 — warnings", () => {
    it("adds POSSIBLY_INACTIVE when voter version is older than most recent import", async () => {
      setupVoter({
        party: "DEM",
        stateAssmblyDistrict: "1",
        latestRecordEntryYear: 2024,
        latestRecordEntryNumber: 1,
      });
      setupCommitteeList();
      setupCrosswalk("1");
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      (prismaMock.voterRecord.findFirst as jest.Mock).mockResolvedValue({
        latestRecordEntryYear: 2024,
        latestRecordEntryNumber: 2,
      });

      const result = await validateEligibility(voterId, committeeListId, termId);

      expect(result.eligible).toBe(true);
      expect(
        result.warnings.some(
          (w) =>
            w.code === "POSSIBLY_INACTIVE" &&
            w.message.includes("most recent voter file import"),
        ),
      ).toBe(true);
    });

    it("does not add POSSIBLY_INACTIVE when voter version equals most recent", async () => {
      setupVoter({ party: "DEM", stateAssmblyDistrict: "1" });
      setupCommitteeList();
      setupCrosswalk("1");
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      (prismaMock.voterRecord.findFirst as jest.Mock).mockResolvedValue({
        latestRecordEntryYear: 2024,
        latestRecordEntryNumber: 1,
      });

      const result = await validateEligibility(voterId, committeeListId, termId);

      expect(result.eligible).toBe(true);
      expect(result.warnings.filter((w) => w.code === "POSSIBLY_INACTIVE")).toHaveLength(0);
    });

    it("adds RECENT_RESIGNATION when voter has resigned within 90 days", async () => {
      setupVoter({ party: "DEM", stateAssmblyDistrict: "1" });
      setupCommitteeList();
      setupCrosswalk("1");
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      // Order: recentResignation, pendingInOther, activeInOther
      getMembershipMock(prismaMock).findFirst
        .mockResolvedValueOnce({ id: "resigned-id" })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (prismaMock.voterRecord.findFirst as jest.Mock).mockResolvedValue({
        latestRecordEntryYear: 2024,
        latestRecordEntryNumber: 1,
      });

      const result = await validateEligibility(voterId, committeeListId, termId);

      expect(result.eligible).toBe(true);
      expect(
        result.warnings.some(
          (w) =>
            w.code === "RECENT_RESIGNATION" && w.message.includes("90 days"),
        ),
      ).toBe(true);
    });

    it("adds PENDING_IN_ANOTHER_COMMITTEE when voter has SUBMITTED in another committee", async () => {
      setupVoter({ party: "DEM", stateAssmblyDistrict: "1" });
      setupCommitteeList();
      setupCrosswalk("1");
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      // Order: recentResignation, pendingInOther, activeInOther
      getMembershipMock(prismaMock).findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "pending-other" })
        .mockResolvedValueOnce(null);
      (prismaMock.voterRecord.findFirst as jest.Mock).mockResolvedValue({
        latestRecordEntryYear: 2024,
        latestRecordEntryNumber: 1,
      });

      const result = await validateEligibility(voterId, committeeListId, termId);

      expect(result.eligible).toBe(true);
      expect(
        result.warnings.some(
          (w) =>
            w.code === "PENDING_IN_ANOTHER_COMMITTEE" &&
            w.message.includes("pending submission"),
        ),
      ).toBe(true);
    });
  });

  describe("forceAdd override", () => {
    it("returns eligible true with bypassedReasons when forceAdd bypasses overridable stop", async () => {
      setupVoter({ party: "REP" }); // PARTY_MISMATCH
      setupCommitteeList();
      setupCrosswalk("1");
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      setupGovernanceConfig({ nonOverridableIneligibilityReasons: [] }); // PARTY is overridable

      const result = await validateEligibility(voterId, committeeListId, termId, {
        forceAdd: true,
        overrideReason: "Executive Committee approved",
      });

      expect(result.eligible).toBe(true);
      expect(result.hardStops).toEqual([]);
      expect(result.bypassedReasons).toEqual(["PARTY_MISMATCH"]);
    });

    it("returns eligible false when forceAdd but stop is non-overridable", async () => {
      setupVoter({ party: "REP" });
      setupCommitteeList();
      setupCrosswalk("1");
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      setupGovernanceConfig({
        nonOverridableIneligibilityReasons: ["PARTY_MISMATCH" as IneligibilityReason],
      });

      const result = await validateEligibility(voterId, committeeListId, termId, {
        forceAdd: true,
        overrideReason: "Reason",
      });

      expect(result.eligible).toBe(false);
      expect(result.hardStops).toContain("PARTY_MISMATCH");
      expect(result.bypassedReasons).toBeUndefined();
    });

    it("returns validationError when forceAdd true but overrideReason missing", async () => {
      setupVoter({ party: "REP" });
      setupCommitteeList();
      setupCrosswalk("1");
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      setupGovernanceConfig({ nonOverridableIneligibilityReasons: [] });

      const result = await validateEligibility(voterId, committeeListId, termId, {
        forceAdd: true,
        overrideReason: "",
      });

      expect(result.eligible).toBe(false);
      expect(result.validationError).toBeDefined();
      expect(result.validationError).toContain("overrideReason");
    });
  });
});
