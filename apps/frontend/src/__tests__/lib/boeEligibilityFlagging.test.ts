import type { PrismaClient } from "@prisma/client";
import { runBoeEligibilityFlagging } from "@voter-file-tool/shared-prisma";

type MockEligibilityDb = {
  committeeTerm: { findFirst: jest.Mock };
  committeeGovernanceConfig: { findFirst: jest.Mock };
  voterRecord: { findFirst: jest.Mock };
  committeeMembership: { findMany: jest.Mock };
  ltedDistrictCrosswalk: { findMany: jest.Mock };
  eligibilityFlag: {
    findMany: jest.Mock;
    createMany: jest.Mock;
    updateMany: jest.Mock;
  };
};

function createDbMock(): MockEligibilityDb {
  return {
    committeeTerm: { findFirst: jest.fn() },
    committeeGovernanceConfig: { findFirst: jest.fn() },
    voterRecord: { findFirst: jest.fn() },
    committeeMembership: { findMany: jest.fn() },
    ltedDistrictCrosswalk: { findMany: jest.fn() },
    eligibilityFlag: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

describe("runBoeEligibilityFlagging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("detects each flag reason and creates pending flags", async () => {
    const db = createDbMock();
    db.committeeGovernanceConfig.findFirst.mockResolvedValue({
      requiredPartyCode: "DEM",
      requireAssemblyDistrictMatch: true,
    });
    db.voterRecord.findFirst.mockResolvedValue({
      latestRecordEntryYear: 2026,
      latestRecordEntryNumber: 10,
    });
    db.committeeMembership.findMany.mockResolvedValue([
      {
        id: "m-party",
        committeeListId: 1,
        voterRecordId: "V1",
        committeeList: { cityTown: "A", legDistrict: 1, electionDistrict: 1 },
        voterRecord: {
          party: "REP",
          stateAssmblyDistrict: "1",
          latestRecordEntryYear: 2026,
          latestRecordEntryNumber: 10,
        },
      },
      {
        id: "m-ad",
        committeeListId: 2,
        voterRecordId: "V2",
        committeeList: { cityTown: "B", legDistrict: 2, electionDistrict: 2 },
        voterRecord: {
          party: "DEM",
          stateAssmblyDistrict: "99",
          latestRecordEntryYear: 2026,
          latestRecordEntryNumber: 10,
        },
      },
      {
        id: "m-inactive",
        committeeListId: 3,
        voterRecordId: "V3",
        committeeList: { cityTown: "C", legDistrict: 3, electionDistrict: 3 },
        voterRecord: {
          party: "DEM",
          stateAssmblyDistrict: "3",
          latestRecordEntryYear: 2025,
          latestRecordEntryNumber: 9,
        },
      },
      {
        id: "m-missing",
        committeeListId: 4,
        voterRecordId: "V4",
        committeeList: { cityTown: "D", legDistrict: 4, electionDistrict: 4 },
        voterRecord: null,
      },
    ]);
    db.ltedDistrictCrosswalk.findMany.mockResolvedValue([
      {
        cityTown: "A",
        legDistrict: 1,
        electionDistrict: 1,
        stateAssemblyDistrict: "1",
      },
      {
        cityTown: "B",
        legDistrict: 2,
        electionDistrict: 2,
        stateAssemblyDistrict: "2",
      },
      {
        cityTown: "C",
        legDistrict: 3,
        electionDistrict: 3,
        stateAssemblyDistrict: "3",
      },
      {
        cityTown: "D",
        legDistrict: 4,
        electionDistrict: 4,
        stateAssemblyDistrict: "4",
      },
    ]);
    db.eligibilityFlag.findMany.mockResolvedValue([]);
    db.eligibilityFlag.createMany.mockResolvedValue({ count: 4 });

    const summary = await runBoeEligibilityFlagging(
      db as unknown as PrismaClient,
      {
        termId: "term-1",
        sourceReportId: "cm1234567890abcdef123456",
      },
    );

    expect(summary.scanned).toBe(4);
    expect(summary.newFlags).toBe(4);
    expect(summary.existingPending).toBe(0);
    expect(db.eligibilityFlag.createMany).toHaveBeenCalledTimes(1);
    expect(db.eligibilityFlag.updateMany).not.toHaveBeenCalled();
    const createManyArgs = db.eligibilityFlag.createMany.mock.calls[0][0] as {
      data: Array<{ reason: string; sourceReportId?: string }>;
    };
    expect(createManyArgs.data).toHaveLength(4);
    expect(createManyArgs.data.map((row) => row.reason).sort()).toEqual([
      "ASSEMBLY_DISTRICT_MISMATCH",
      "PARTY_MISMATCH",
      "POSSIBLY_INACTIVE",
      "VOTER_NOT_FOUND",
    ]);
    expect(
      createManyArgs.data.every(
        (row) => row.sourceReportId === "cm1234567890abcdef123456",
      ),
    ).toBe(true);
  });

  it("does not create duplicate pending flags for the same membership + reason", async () => {
    const db = createDbMock();
    db.committeeGovernanceConfig.findFirst.mockResolvedValue({
      requiredPartyCode: "DEM",
      requireAssemblyDistrictMatch: false,
    });
    db.voterRecord.findFirst.mockResolvedValue({
      latestRecordEntryYear: 2026,
      latestRecordEntryNumber: 10,
    });
    db.committeeMembership.findMany.mockResolvedValue([
      {
        id: "m-party",
        committeeListId: 1,
        voterRecordId: "V1",
        committeeList: { cityTown: "A", legDistrict: 1, electionDistrict: 1 },
        voterRecord: {
          party: "REP",
          stateAssmblyDistrict: "1",
          latestRecordEntryYear: 2026,
          latestRecordEntryNumber: 10,
        },
      },
    ]);
    db.ltedDistrictCrosswalk.findMany.mockResolvedValue([]);
    db.eligibilityFlag.findMany.mockResolvedValue([
      {
        id: "flag-existing",
        membershipId: "m-party",
        reason: "PARTY_MISMATCH",
        details: {
          expectedPartyCode: "DEM",
          voterPartyCode: "REP",
        },
        sourceReportId: null,
      },
    ]);
    db.eligibilityFlag.createMany.mockResolvedValue({ count: 0 });

    const summary = await runBoeEligibilityFlagging(
      db as unknown as PrismaClient,
      {
        termId: "term-1",
      },
    );

    expect(summary.newFlags).toBe(0);
    expect(summary.existingPending).toBe(1);
    expect(db.eligibilityFlag.createMany).not.toHaveBeenCalled();
    expect(db.eligibilityFlag.updateMany).not.toHaveBeenCalled();
  });

  it("creates a new pending flag when no pending duplicate exists (e.g., after prior dismissal)", async () => {
    const db = createDbMock();
    db.committeeGovernanceConfig.findFirst.mockResolvedValue({
      requiredPartyCode: "DEM",
      requireAssemblyDistrictMatch: false,
    });
    db.voterRecord.findFirst.mockResolvedValue({
      latestRecordEntryYear: 2026,
      latestRecordEntryNumber: 10,
    });
    db.committeeMembership.findMany.mockResolvedValue([
      {
        id: "m-party",
        committeeListId: 1,
        voterRecordId: "V1",
        committeeList: { cityTown: "A", legDistrict: 1, electionDistrict: 1 },
        voterRecord: {
          party: "REP",
          stateAssmblyDistrict: "1",
          latestRecordEntryYear: 2026,
          latestRecordEntryNumber: 10,
        },
      },
    ]);
    db.ltedDistrictCrosswalk.findMany.mockResolvedValue([]);
    // Service queries pending only. If none are pending, a new one is created.
    db.eligibilityFlag.findMany.mockResolvedValue([]);
    db.eligibilityFlag.createMany.mockResolvedValue({ count: 1 });

    const summary = await runBoeEligibilityFlagging(
      db as unknown as PrismaClient,
      { termId: "term-1" },
    );

    expect(summary.newFlags).toBe(1);
    expect(db.eligibilityFlag.createMany).toHaveBeenCalledTimes(1);
    expect(db.eligibilityFlag.updateMany).not.toHaveBeenCalled();
  });

  it("updates existing pending flags with refreshed details and source report id", async () => {
    const db = createDbMock();
    db.committeeGovernanceConfig.findFirst.mockResolvedValue({
      requiredPartyCode: "DEM",
      requireAssemblyDistrictMatch: false,
    });
    db.voterRecord.findFirst.mockResolvedValue({
      latestRecordEntryYear: 2026,
      latestRecordEntryNumber: 10,
    });
    db.committeeMembership.findMany.mockResolvedValue([
      {
        id: "m-party",
        committeeListId: 1,
        voterRecordId: "V1",
        committeeList: { cityTown: "A", legDistrict: 1, electionDistrict: 1 },
        voterRecord: {
          party: "REP",
          stateAssmblyDistrict: "1",
          latestRecordEntryYear: 2026,
          latestRecordEntryNumber: 10,
        },
      },
    ]);
    db.ltedDistrictCrosswalk.findMany.mockResolvedValue([]);
    db.eligibilityFlag.findMany.mockResolvedValue([
      {
        id: "flag-existing",
        membershipId: "m-party",
        reason: "PARTY_MISMATCH",
        details: {
          expectedPartyCode: "OLD",
          voterPartyCode: "OLD",
        },
        sourceReportId: null,
      },
    ]);
    db.eligibilityFlag.createMany.mockResolvedValue({ count: 0 });

    const summary = await runBoeEligibilityFlagging(
      db as unknown as PrismaClient,
      {
        termId: "term-1",
        sourceReportId: "cm1234567890abcdef123456",
      },
    );

    expect(summary.newFlags).toBe(0);
    expect(summary.existingPending).toBe(1);
    expect(db.eligibilityFlag.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "flag-existing",
          status: "PENDING",
        },
        data: expect.objectContaining({
          sourceReportId: "cm1234567890abcdef123456",
          details: expect.objectContaining({
            expectedPartyCode: "DEM",
            voterPartyCode: "REP",
          }),
        }),
      }),
    );
  });
});
