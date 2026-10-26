import {
  PrivilegeLevel,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import { runBoeEligibilityFlagging } from "@voter-file-tool/shared-prisma";
import { namedRawQueryValues } from "../utils/mocks";
import {
  firstCallArg,
  REFRESH_PENDING_FLAGS_PARAMS,
  RESOLVE_STALE_FLAGS_PARAMS,
} from "../utils/testUtils";

type MockEligibilityDb = {
  $transaction: jest.Mock;
  $executeRaw: jest.Mock;
  $queryRaw: jest.Mock;
  committeeTerm: { findFirst: jest.Mock };
  committeeGovernanceConfig: { findFirst: jest.Mock };
  voterRecord: { findFirst: jest.Mock };
  committeeMembership: { findMany: jest.Mock };
  ltedDistrictCrosswalk: { findMany: jest.Mock };
  eligibilityFlag: {
    findMany: jest.Mock;
    createMany: jest.Mock;
    // The per-flag writes the batched run replaced; tests assert they stay unused.
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
    createMany: jest.Mock;
  };
};

function createDbMock(): MockEligibilityDb {
  const db: MockEligibilityDb = {
    // The run's writes go through one interactive transaction on the same client.
    $transaction: jest.fn(),
    $executeRaw: jest.fn().mockResolvedValue(0),
    $queryRaw: jest.fn().mockResolvedValue([]),
    committeeTerm: { findFirst: jest.fn() },
    committeeGovernanceConfig: { findFirst: jest.fn() },
    voterRecord: { findFirst: jest.fn() },
    committeeMembership: { findMany: jest.fn() },
    ltedDistrictCrosswalk: { findMany: jest.fn() },
    eligibilityFlag: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(db));
  return db;
}

/** The refresh UPDATE's values by name; `details` is JSON text or null per row. */
function refreshValues(db: MockEligibilityDb) {
  return namedRawQueryValues(db.$executeRaw, REFRESH_PENDING_FLAGS_PARAMS);
}

function resolveValues(db: MockEligibilityDb) {
  return namedRawQueryValues(db.$queryRaw, RESOLVE_STALE_FLAGS_PARAMS);
}

/** Parses the JSON text entries of a details array, keeping nulls. */
function parsedDetails(details: unknown): unknown[] {
  return (details as Array<string | null>).map((d) =>
    d === null ? null : (JSON.parse(d) as unknown),
  );
}

// runBoeEligibilityFlagging only touches the delegates above; the cast stops here.
function asEligibilityDb(db: MockEligibilityDb): PrismaClient {
  return db as unknown as PrismaClient;
}

// Same delegate subset, minus $transaction, as a transaction client; the cast stops here.
function asTransactionClient(
  tx: Omit<MockEligibilityDb, "$transaction">,
): Prisma.TransactionClient {
  return tx as unknown as Prisma.TransactionClient;
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
      asEligibilityDb(db),
      {
        termId: "term-1",
        sourceReportId: "cm1234567890abcdef123456",
      },
    );

    expect(summary.scanned).toBe(4);
    expect(summary.newFlags).toBe(4);
    expect(summary.existingPending).toBe(0);
    expect(summary.autoResolved).toBe(0);
    expect(db.eligibilityFlag.createMany).toHaveBeenCalledTimes(1);
    expect(db.$executeRaw).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
    const createManyArgs = firstCallArg<{
      data: Array<{
        reason: string;
        sourceReportId?: string;
        details?: {
          expectedPartyCode?: string;
          voterPartyCode?: string;
          expectedAssemblyDistrict?: string | null;
          voterAssemblyDistrict?: string | null;
        };
      }>;
    }>(db.eligibilityFlag.createMany);
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

    const partyFlag = createManyArgs.data.find(
      (row) => row.reason === "PARTY_MISMATCH",
    );
    expect(partyFlag?.details).toEqual({
      expectedPartyCode: "DEM",
      voterPartyCode: "REP",
    });

    const adFlag = createManyArgs.data.find(
      (row) => row.reason === "ASSEMBLY_DISTRICT_MISMATCH",
    );
    expect(adFlag?.details).toEqual({
      expectedAssemblyDistrict: "2",
      voterAssemblyDistrict: "99",
    });
  });

  it("normalizes whitespace in party and AD flag details", async () => {
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
        id: "m-whitespace",
        committeeListId: 1,
        voterRecordId: "V1",
        committeeList: { cityTown: "A", legDistrict: 1, electionDistrict: 1 },
        voterRecord: {
          party: " REP ",
          stateAssmblyDistrict: " 2 ",
          latestRecordEntryYear: 2026,
          latestRecordEntryNumber: 10,
        },
      },
    ]);
    db.ltedDistrictCrosswalk.findMany.mockResolvedValue([
      {
        cityTown: "A",
        legDistrict: 1,
        electionDistrict: 1,
        stateAssemblyDistrict: " 1 ",
      },
    ]);
    db.eligibilityFlag.findMany.mockResolvedValue([]);
    db.eligibilityFlag.createMany.mockResolvedValue({ count: 2 });

    await runBoeEligibilityFlagging(asEligibilityDb(db), {
      termId: "term-1",
    });

    const createManyArgs = firstCallArg<{
      data: Array<{
        reason: string;
        details?: {
          expectedPartyCode?: string;
          voterPartyCode?: string;
          expectedAssemblyDistrict?: string | null;
          voterAssemblyDistrict?: string | null;
        };
      }>;
    }>(db.eligibilityFlag.createMany);

    const partyFlag = createManyArgs.data.find(
      (row) => row.reason === "PARTY_MISMATCH",
    );
    expect(partyFlag?.details).toEqual({
      expectedPartyCode: "DEM",
      voterPartyCode: "REP",
    });

    const adFlag = createManyArgs.data.find(
      (row) => row.reason === "ASSEMBLY_DISTRICT_MISMATCH",
    );
    expect(adFlag?.details).toEqual({
      expectedAssemblyDistrict: "1",
      voterAssemblyDistrict: "2",
    });
  });

  it("does not flag a member who lives in a different ED but the same AD", async () => {
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
        id: "m-other-ed",
        committeeListId: 1,
        voterRecordId: "V1",
        committeeList: { cityTown: "A", legDistrict: 1, electionDistrict: 1 },
        voterRecord: {
          party: "DEM",
          stateAssmblyDistrict: "1",
          electionDistrict: 7,
          latestRecordEntryYear: 2026,
          latestRecordEntryNumber: 10,
        },
      },
    ]);
    db.ltedDistrictCrosswalk.findMany.mockResolvedValue([
      {
        cityTown: "A",
        legDistrict: 1,
        electionDistrict: 1,
        stateAssemblyDistrict: "1",
      },
    ]);
    db.eligibilityFlag.findMany.mockResolvedValue([]);

    const summary = await runBoeEligibilityFlagging(
      asEligibilityDb(db),
      { termId: "term-1" },
    );

    expect(summary.newFlags).toBe(0);
    expect(db.eligibilityFlag.createMany).not.toHaveBeenCalled();
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
      asEligibilityDb(db),
      {
        termId: "term-1",
      },
    );

    expect(summary.newFlags).toBe(0);
    expect(summary.existingPending).toBe(1);
    expect(summary.autoResolved).toBe(0);
    expect(db.eligibilityFlag.createMany).not.toHaveBeenCalled();
    expect(db.$executeRaw).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
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
      asEligibilityDb(db),
      { termId: "term-1" },
    );

    expect(summary.newFlags).toBe(1);
    expect(summary.autoResolved).toBe(0);
    expect(db.eligibilityFlag.createMany).toHaveBeenCalledTimes(1);
    expect(db.$executeRaw).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
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
      asEligibilityDb(db),
      {
        termId: "term-1",
        sourceReportId: "cm1234567890abcdef123456",
      },
    );

    expect(summary.newFlags).toBe(0);
    expect(summary.existingPending).toBe(1);
    expect(summary.autoResolved).toBe(0);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    const { ids, details, sourceReportIds } = refreshValues(db);
    expect(ids).toEqual(["flag-existing"]);
    expect(parsedDetails(details)).toEqual([
      { expectedPartyCode: "DEM", voterPartyCode: "REP" },
    ]);
    expect(sourceReportIds).toEqual(["cm1234567890abcdef123456"]);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  /** A still-REP member with one pending PARTY_MISMATCH flag in the given state. */
  function pendingPartyFlagDb(flag: {
    details: Prisma.InputJsonValue;
    sourceReportId: string | null;
  }): MockEligibilityDb {
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
        ...flag,
      },
    ]);
    return db;
  }

  it("refreshes only the details when the source report is unchanged", async () => {
    const db = pendingPartyFlagDb({
      details: { expectedPartyCode: "OLD", voterPartyCode: "OLD" },
      sourceReportId: "cmoldreport0000000000000",
    });

    const summary = await runBoeEligibilityFlagging(asEligibilityDb(db), {
      termId: "term-1",
    });

    expect(summary.existingPending).toBe(1);
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    const { ids, details, sourceReportIds } = refreshValues(db);
    expect(ids).toEqual(["flag-existing"]);
    expect(parsedDetails(details)).toEqual([
      { expectedPartyCode: "DEM", voterPartyCode: "REP" },
    ]);
    // A null entry makes COALESCE keep the stored sourceReportId.
    expect(sourceReportIds).toEqual([null]);
  });

  it("refreshes only the source report when the details are unchanged", async () => {
    const db = pendingPartyFlagDb({
      details: { expectedPartyCode: "DEM", voterPartyCode: "REP" },
      sourceReportId: "cmoldreport0000000000000",
    });

    const summary = await runBoeEligibilityFlagging(asEligibilityDb(db), {
      termId: "term-1",
      sourceReportId: "cm1234567890abcdef123456",
    });

    expect(summary.existingPending).toBe(1);
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    const { ids, details, sourceReportIds } = refreshValues(db);
    expect(ids).toEqual(["flag-existing"]);
    // A null entry makes COALESCE keep the stored details.
    expect(details).toEqual([null]);
    expect(sourceReportIds).toEqual(["cm1234567890abcdef123456"]);
  });

  it("writes a mixed run of new, refreshed and stale flags in four statements", async () => {
    const db = createDbMock();
    db.committeeGovernanceConfig.findFirst.mockResolvedValue({
      requiredPartyCode: "DEM",
      requireAssemblyDistrictMatch: false,
    });
    db.voterRecord.findFirst.mockResolvedValue({
      latestRecordEntryYear: 2026,
      latestRecordEntryNumber: 10,
    });
    const member = (id: string, party: string) => ({
      id,
      committeeListId: 1,
      voterRecordId: `V-${id}`,
      committeeList: { cityTown: "A", legDistrict: 1, electionDistrict: 1 },
      voterRecord: {
        party,
        stateAssmblyDistrict: "1",
        latestRecordEntryYear: 2026,
        latestRecordEntryNumber: 10,
      },
    });
    db.committeeMembership.findMany.mockResolvedValue([
      member("m-new", "REP"), // newly ineligible: no pending flag yet
      member("m-refresh", "REP"), // still ineligible: pending flag has old details
      member("m-stale", "DEM"), // eligible again: pending flag is stale
    ]);
    db.ltedDistrictCrosswalk.findMany.mockResolvedValue([]);
    db.eligibilityFlag.findMany.mockResolvedValue([
      {
        id: "flag-refresh",
        membershipId: "m-refresh",
        reason: "PARTY_MISMATCH",
        details: { expectedPartyCode: "OLD", voterPartyCode: "OLD" },
        sourceReportId: null,
      },
      {
        id: "flag-stale",
        membershipId: "m-stale",
        reason: "PARTY_MISMATCH",
        details: { expectedPartyCode: "DEM", voterPartyCode: "REP" },
        sourceReportId: null,
      },
    ]);
    db.eligibilityFlag.createMany.mockResolvedValue({ count: 1 });
    db.$queryRaw.mockResolvedValue([{ id: "flag-stale" }]);
    db.auditLog.createMany.mockResolvedValue({ count: 1 });

    const summary = await runBoeEligibilityFlagging(asEligibilityDb(db), {
      termId: "term-1",
    });

    expect(summary).toMatchObject({
      scanned: 3,
      newFlags: 1,
      existingPending: 1,
      autoResolved: 1,
    });
    expect(db.$transaction).toHaveBeenCalledTimes(1);

    const writes = [
      db.eligibilityFlag.createMany,
      db.$executeRaw,
      db.$queryRaw,
      db.auditLog.createMany,
    ];
    for (const write of writes) {
      expect(write).toHaveBeenCalledTimes(1);
    }
    const statements = writes.reduce(
      (total, write) => total + write.mock.calls.length,
      0,
    );
    expect(statements).toBe(4);
    expect(db.eligibilityFlag.updateMany).not.toHaveBeenCalled();
    expect(db.eligibilityFlag.update).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();

    const created = firstCallArg<{ data: Array<{ membershipId: string }> }>(
      db.eligibilityFlag.createMany,
    );
    expect(created.data.map((row) => row.membershipId)).toEqual(["m-new"]);
    expect(refreshValues(db).ids).toEqual(["flag-refresh"]);
    expect(resolveValues(db).ids).toEqual(["flag-stale"]);
  });

  /** Eligible members whose pending PARTY_MISMATCH flags are now stale. */
  function staleFlagsDb(flagIds: string[]): MockEligibilityDb {
    const db = createDbMock();
    db.committeeGovernanceConfig.findFirst.mockResolvedValue({
      requiredPartyCode: "DEM",
      requireAssemblyDistrictMatch: false,
    });
    db.voterRecord.findFirst.mockResolvedValue({
      latestRecordEntryYear: 2026,
      latestRecordEntryNumber: 10,
    });
    db.committeeMembership.findMany.mockResolvedValue(
      flagIds.map((_, i) => ({
        id: `m-${i}`,
        committeeListId: 1,
        voterRecordId: `V${i}`,
        committeeList: { cityTown: "A", legDistrict: 1, electionDistrict: 1 },
        voterRecord: {
          party: "DEM",
          stateAssmblyDistrict: "1",
          latestRecordEntryYear: 2026,
          latestRecordEntryNumber: 10,
        },
      })),
    );
    db.ltedDistrictCrosswalk.findMany.mockResolvedValue([]);
    db.eligibilityFlag.findMany.mockResolvedValue(
      flagIds.map((id, i) => ({
        id,
        membershipId: `m-${i}`,
        reason: "PARTY_MISMATCH",
        details: { expectedPartyCode: "DEM", voterPartyCode: "REP" },
        sourceReportId: "cm1234567890abcdef123456",
      })),
    );
    db.$queryRaw.mockResolvedValue(flagIds.map((id) => ({ id })));
    return db;
  }

  it("auto-resolves stale pending flags and emits system audit metadata", async () => {
    const db = staleFlagsDb(["flag-stale"]);

    const summary = await runBoeEligibilityFlagging(asEligibilityDb(db), {
      termId: "term-1",
      sourceReportId: "cmtrigger000000000000000",
    });

    expect(summary.newFlags).toBe(0);
    expect(summary.existingPending).toBe(0);
    expect(summary.autoResolved).toBe(1);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    const { reviewedById, reviewedAt, ids, details } = resolveValues(db);
    expect(reviewedById).toBe("system");
    expect(ids).toEqual(["flag-stale"]);
    expect(JSON.parse((details as string[])[0]!)).toEqual({
      expectedPartyCode: "DEM",
      voterPartyCode: "REP",
      resolution: "RESOLVED_BY_RESCAN",
      resolutionTimestamp: reviewedAt,
      resolvedByActor: "system",
      resolvedBySourceReportId: "cmtrigger000000000000000",
    });

    const auditArgs = firstCallArg<{
      data: unknown[];
    }>(db.auditLog.createMany);
    expect(auditArgs.data).toEqual([
      {
        userId: "system",
        userRole: PrivilegeLevel.Developer,
        action: "DISCREPANCY_RESOLVED",
        entityType: "EligibilityFlag",
        entityId: "flag-stale",
        beforeValue: { status: "PENDING", reason: "PARTY_MISMATCH" },
        afterValue: { status: "RESOLVED_BY_RESCAN", reason: "PARTY_MISMATCH" },
        metadata: {
          source: "boe_flagging",
          decision: "auto_resolve",
          actorType: "system",
          actorUserId: "system",
          flagId: "flag-stale",
          reason: "PARTY_MISMATCH",
          resolution: "RESOLVED_BY_RESCAN",
          resolvedAt: reviewedAt,
          triggerSourceReportId: "cmtrigger000000000000000",
        },
      },
    ]);
  });

  it("resolves any number of stale flags in one update and one audit insert", async () => {
    const flagIds = Array.from({ length: 1500 }, (_, i) => `flag-${i}`);
    const db = staleFlagsDb(flagIds);

    const summary = await runBoeEligibilityFlagging(asEligibilityDb(db), {
      termId: "term-1",
    });

    expect(summary.autoResolved).toBe(1500);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(db.auditLog.createMany).toHaveBeenCalledTimes(1);
    const auditArgs = firstCallArg<{
      data: unknown[];
    }>(db.auditLog.createMany);
    expect(auditArgs.data).toHaveLength(1500);
  });

  it("audits and counts only the flags the guarded update actually resolved", async () => {
    const db = staleFlagsDb(["flag-a", "flag-reviewed", "flag-c"]);
    // A reviewer decided flag-reviewed between the read and the update.
    db.$queryRaw.mockResolvedValue([{ id: "flag-a" }, { id: "flag-c" }]);

    const summary = await runBoeEligibilityFlagging(asEligibilityDb(db), {
      termId: "term-1",
    });

    expect(summary.autoResolved).toBe(2);
    const auditArgs = firstCallArg<{
      data: Array<{ entityId: string }>;
    }>(db.auditLog.createMany);
    expect(auditArgs.data.map((row) => row.entityId)).toEqual([
      "flag-a",
      "flag-c",
    ]);
  });

  it("writes no audit rows when every stale flag was already reviewed", async () => {
    const db = staleFlagsDb(["flag-reviewed"]);
    db.$queryRaw.mockResolvedValue([]);

    const summary = await runBoeEligibilityFlagging(asEligibilityDb(db), {
      termId: "term-1",
    });

    expect(summary.autoResolved).toBe(0);
    expect(db.auditLog.createMany).not.toHaveBeenCalled();
  });

  it("opens no transaction when the run changes nothing", async () => {
    const db = staleFlagsDb([]);

    const summary = await runBoeEligibilityFlagging(asEligibilityDb(db), {
      termId: "term-1",
    });

    expect(summary).toMatchObject({ newFlags: 0, autoResolved: 0 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("writes directly when handed a transaction client", async () => {
    const { $transaction: _unused, ...tx } = staleFlagsDb(["flag-stale"]);

    const summary = await runBoeEligibilityFlagging(asTransactionClient(tx), {
      termId: "term-1",
    });

    expect(summary.autoResolved).toBe(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.createMany).toHaveBeenCalledTimes(1);
  });
});
