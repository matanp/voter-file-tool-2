/**
 * PostgreSQL-backed proof that the batched BOE eligibility rescan writes what
 * it claims. The unit tests mock $queryRaw/$executeRaw, so only a real database
 * can catch a bad enum cast, a timestamp that lands in the wrong zone, a JSON
 * round-trip, or a PENDING guard that doesn't hold.
 *
 * Run with `pnpm --filter voter-file-tool test:pg`. Skips when there is no
 * local test database URL (see jest.pg.env.cjs).
 */
import { PrivilegeLevel, type Prisma, type PrismaClient } from "@prisma/client";
import type { runBoeEligibilityFlagging as RunBoeEligibilityFlagging } from "@voter-file-tool/shared-prisma";

const canRunPg = Boolean(process.env.POSTGRES_PRISMA_URL_TEST);
if (!canRunPg) {
  console.warn(
    "Skipping PostgreSQL integration tests: set POSTGRES_PRISMA_URL_TEST, or use a localhost POSTGRES_PRISMA_URL",
  );
}
const describePg = canRunPg ? describe : describe.skip;

const TERM_ID = "pg-rescan-term";
const TOWN = "PG RESCAN TOWN";
const SOURCE_REPORT_ID = "cmpgrescan00000000000000";

describePg("BOE eligibility rescan (PostgreSQL)", () => {
  let prisma: PrismaClient;
  let runBoeEligibilityFlagging: typeof RunBoeEligibilityFlagging;
  let committeeListId: number;

  beforeAll(async () => {
    ({ runBoeEligibilityFlagging } = await import(
      "@voter-file-tool/shared-prisma"
    ));
    prisma = (await import("~/lib/prisma")).default;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  /** A voter in the committee's LTED with an ACTIVE membership; returns the membership id. */
  const seedMember = async (
    vrcnum: string,
    party: string,
    assemblyDistrict: string,
  ): Promise<string> => {
    await prisma.voterRecord.create({
      data: {
        VRCNUM: vrcnum,
        latestRecordEntryYear: 2026,
        latestRecordEntryNumber: 1,
        party,
        stateAssmblyDistrict: assemblyDistrict,
      },
    });
    const membership = await prisma.committeeMembership.create({
      data: {
        voterRecordId: vrcnum,
        committeeListId,
        termId: TERM_ID,
        status: "ACTIVE",
        membershipType: "PETITIONED",
      },
    });
    return membership.id;
  };

  const seedPendingFlag = async (
    id: string,
    membershipId: string,
    voterRecordId: string,
    reason: "PARTY_MISMATCH" | "ASSEMBLY_DISTRICT_MISMATCH",
    details: Prisma.InputJsonObject | null,
    sourceReportId?: string,
  ) => {
    await prisma.eligibilityFlag.create({
      data: {
        id,
        membershipId,
        committeeListId,
        voterRecordId,
        termId: TERM_ID,
        reason,
        status: "PENDING",
        ...(details ? { details } : {}),
        ...(sourceReportId ? { sourceReportId } : {}),
      },
    });
  };

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE
        "AuditLog",
        "EligibilityFlag",
        "CommitteeMembership",
        "Seat",
        "CommitteeList",
        "CommitteeTerm",
        "CommitteeGovernanceConfig",
        "LtedDistrictCrosswalk",
        "VoterRecord",
        "User"
      CASCADE`,
    );
    await prisma.user.create({
      data: {
        id: "system",
        email: "system@internal",
        name: "System",
        privilegeLevel: PrivilegeLevel.Developer,
      },
    });
    await prisma.committeeTerm.create({
      data: {
        id: TERM_ID,
        label: "PG 2026–2028",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2028-12-31"),
        isActive: true,
      },
    });
    await prisma.committeeGovernanceConfig.create({
      data: {
        id: "pg-governance",
        requiredPartyCode: "DEM",
        maxSeatsPerLted: 4,
        requireAssemblyDistrictMatch: true,
        nonOverridableIneligibilityReasons: [],
      },
    });
    await prisma.ltedDistrictCrosswalk.create({
      data: {
        cityTown: TOWN,
        legDistrict: 1,
        electionDistrict: 1,
        stateAssemblyDistrict: "131",
      },
    });
    committeeListId = (
      await prisma.committeeList.create({
        data: {
          cityTown: TOWN,
          legDistrict: 1,
          electionDistrict: 1,
          termId: TERM_ID,
        },
      })
    ).id;
  });

  it("resolves stale flags, refreshes live ones and audits each resolution once", async () => {
    // Eligible now: its party and null-AD flags (the prod case) are stale.
    const eligible = await seedMember("PG_ELIGIBLE", "DEM", "131");
    await seedPendingFlag("flag-party-stale", eligible, "PG_ELIGIBLE", "PARTY_MISMATCH", {
      expectedPartyCode: "DEM",
      voterPartyCode: "REP",
    });
    await seedPendingFlag(
      "flag-ad-stale",
      eligible,
      "PG_ELIGIBLE",
      "ASSEMBLY_DISTRICT_MISMATCH",
      { expectedAssemblyDistrict: null, voterAssemblyDistrict: "131" },
    );
    // Still REP: its flag stays pending with refreshed details.
    const rep = await seedMember("PG_REP", "REP", "131");
    await seedPendingFlag("flag-party-live", rep, "PG_REP", "PARTY_MISMATCH", {
      expectedPartyCode: "OLD",
    });
    // Lives in another AD and has no flag yet.
    await seedMember("PG_MOVED", "DEM", "999");

    const before = new Date();
    const summary = await runBoeEligibilityFlagging(prisma, {
      termId: TERM_ID,
      sourceReportId: SOURCE_REPORT_ID,
    });

    expect(summary).toMatchObject({
      termId: TERM_ID,
      scanned: 3,
      newFlags: 1,
      existingPending: 1,
      autoResolved: 2,
    });

    const resolved = await prisma.eligibilityFlag.findMany({
      where: { status: "RESOLVED_BY_RESCAN" },
      orderBy: { id: "asc" },
    });
    expect(resolved.map((flag) => flag.id)).toEqual([
      "flag-ad-stale",
      "flag-party-stale",
    ]);
    for (const flag of resolved) {
      expect(flag.reviewedById).toBe("system");
      // Within a few seconds of now proves the timestamp kept its UTC wall time.
      expect(Math.abs(flag.reviewedAt!.getTime() - before.getTime())).toBeLessThan(10_000);
      expect(flag.updatedAt.getTime()).toBe(flag.reviewedAt!.getTime());
    }
    const resolvedAt = resolved[0]!.reviewedAt!.toISOString();
    expect(resolved[1]!.details).toEqual({
      expectedPartyCode: "DEM",
      voterPartyCode: "REP",
      resolution: "RESOLVED_BY_RESCAN",
      resolutionTimestamp: resolvedAt,
      resolvedByActor: "system",
      resolvedBySourceReportId: SOURCE_REPORT_ID,
    });
    expect(resolved[0]!.details).toMatchObject({
      expectedAssemblyDistrict: null,
      resolution: "RESOLVED_BY_RESCAN",
    });

    const live = await prisma.eligibilityFlag.findUniqueOrThrow({
      where: { id: "flag-party-live" },
    });
    expect(live.status).toBe("PENDING");
    expect(live.details).toEqual({ expectedPartyCode: "DEM", voterPartyCode: "REP" });
    expect(live.sourceReportId).toBe(SOURCE_REPORT_ID);

    const created = await prisma.eligibilityFlag.findMany({
      where: { voterRecordId: "PG_MOVED" },
    });
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      reason: "ASSEMBLY_DISTRICT_MISMATCH",
      status: "PENDING",
      details: { expectedAssemblyDistrict: "131", voterAssemblyDistrict: "999" },
    });

    const audit = await prisma.auditLog.findMany({ orderBy: { entityId: "asc" } });
    expect(audit).toHaveLength(2);
    expect(audit[1]).toMatchObject({
      userId: "system",
      userRole: PrivilegeLevel.Developer,
      action: "DISCREPANCY_RESOLVED",
      entityType: "EligibilityFlag",
      entityId: "flag-party-stale",
      beforeValue: { status: "PENDING", reason: "PARTY_MISMATCH" },
      afterValue: { status: "RESOLVED_BY_RESCAN", reason: "PARTY_MISMATCH" },
      metadata: {
        source: "boe_flagging",
        decision: "auto_resolve",
        actorType: "system",
        actorUserId: "system",
        flagId: "flag-party-stale",
        reason: "PARTY_MISMATCH",
        resolution: "RESOLVED_BY_RESCAN",
        resolvedAt,
        triggerSourceReportId: SOURCE_REPORT_ID,
      },
    });

    // A second run finds nothing to resolve and writes no audit rows.
    const again = await runBoeEligibilityFlagging(prisma, { termId: TERM_ID });
    expect(again).toMatchObject({ newFlags: 0, existingPending: 2, autoResolved: 0 });
    expect(await prisma.auditLog.count()).toBe(2);
  });

  const OLD_SOURCE_REPORT_ID = "cmpgrescanold00000000000";

  it("refreshes only the details and keeps the stored source report", async () => {
    const rep = await seedMember("PG_REP", "REP", "131");
    await seedPendingFlag(
      "flag-details-only",
      rep,
      "PG_REP",
      "PARTY_MISMATCH",
      { expectedPartyCode: "OLD" },
      OLD_SOURCE_REPORT_ID,
    );

    // No sourceReportId on the run, so only the details change.
    const summary = await runBoeEligibilityFlagging(prisma, { termId: TERM_ID });

    expect(summary).toMatchObject({ newFlags: 0, existingPending: 1, autoResolved: 0 });
    const flag = await prisma.eligibilityFlag.findUniqueOrThrow({
      where: { id: "flag-details-only" },
    });
    expect(flag.status).toBe("PENDING");
    expect(flag.details).toEqual({ expectedPartyCode: "DEM", voterPartyCode: "REP" });
    expect(flag.sourceReportId).toBe(OLD_SOURCE_REPORT_ID);
  });

  it("refreshes only the source report and keeps the stored details", async () => {
    const rep = await seedMember("PG_REP", "REP", "131");
    await seedPendingFlag(
      "flag-source-only",
      rep,
      "PG_REP",
      "PARTY_MISMATCH",
      { expectedPartyCode: "DEM", voterPartyCode: "REP" },
      OLD_SOURCE_REPORT_ID,
    );
    const seeded = await prisma.eligibilityFlag.findUniqueOrThrow({
      where: { id: "flag-source-only" },
    });

    const summary = await runBoeEligibilityFlagging(prisma, {
      termId: TERM_ID,
      sourceReportId: SOURCE_REPORT_ID,
    });

    expect(summary).toMatchObject({ newFlags: 0, existingPending: 1, autoResolved: 0 });
    const flag = await prisma.eligibilityFlag.findUniqueOrThrow({
      where: { id: "flag-source-only" },
    });
    expect(flag.status).toBe("PENDING");
    expect(flag.sourceReportId).toBe(SOURCE_REPORT_ID);
    // The same UPDATE wrote sourceReportId, so the kept details are COALESCE's doing.
    expect(flag.details).toEqual(seeded.details);
  });

  it("leaves a flag a reviewer decided mid-run alone and does not audit it", async () => {
    const eligible = await seedMember("PG_ELIGIBLE", "DEM", "131");
    await seedPendingFlag("flag-stale", eligible, "PG_ELIGIBLE", "PARTY_MISMATCH", null);
    const other = await seedMember("PG_OTHER", "DEM", "131");
    await seedPendingFlag("flag-raced", other, "PG_OTHER", "PARTY_MISMATCH", {
      expectedPartyCode: "DEM",
    });

    // A reviewer dismisses flag-raced after the run has read the pending flags.
    const racingDb = new Proxy(prisma, {
      get(target, prop) {
        if (prop === "eligibilityFlag") {
          return {
            findMany: async (args: Parameters<PrismaClient["eligibilityFlag"]["findMany"]>[0]) => {
              const rows = await target.eligibilityFlag.findMany(args);
              await target.eligibilityFlag.update({
                where: { id: "flag-raced" },
                data: { status: "DISMISSED", reviewedById: "system" },
              });
              return rows;
            },
          };
        }
        const value: unknown = Reflect.get(target, prop, target);
        return typeof value === "function"
          ? (value as (...args: unknown[]) => unknown).bind(target)
          : value;
      },
    });

    const summary = await runBoeEligibilityFlagging(racingDb, { termId: TERM_ID });

    expect(summary.autoResolved).toBe(1);
    const flags = await prisma.eligibilityFlag.findMany({ orderBy: { id: "asc" } });
    expect(flags.map((flag) => [flag.id, flag.status])).toEqual([
      ["flag-raced", "DISMISSED"],
      ["flag-stale", "RESOLVED_BY_RESCAN"],
    ]);
    // A null details column is wrapped, as buildRescanResolvedDetails always did.
    expect(flags[1]!.details).toMatchObject({ resolution: "RESOLVED_BY_RESCAN" });
    expect(flags[1]!.details).not.toHaveProperty("resolvedBySourceReportId");
    const audit = await prisma.auditLog.findMany();
    expect(audit.map((row) => row.entityId)).toEqual(["flag-stale"]);
  });
});
