/**
 * PostgreSQL-backed proof that "create missing committees" derives EDs from the
 * voter file correctly (town code → town, L_T text → LD) and creates exactly the
 * committees and seats that are missing. The SQL cast and grouping can only be
 * checked against a real database.
 *
 * Run with `pnpm --filter voter-file-tool test:pg`. Skips when there is no
 * local test database URL (see jest.pg.env.cjs).
 */
import { PrivilegeLevel, type PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import type {
  GET as MissingGet,
  POST as MissingPost,
} from "~/app/api/admin/committees/missing/route";

jest.mock("~/auth", () => ({
  auth: jest.fn().mockResolvedValue({
    user: { id: "pg-admin", privilegeLevel: "Admin" },
  }),
}));

const canRunPg = Boolean(process.env.POSTGRES_PRISMA_URL_TEST);
if (!canRunPg) {
  console.warn(
    "Skipping PostgreSQL integration tests: set POSTGRES_PRISMA_URL_TEST, or use a localhost POSTGRES_PRISMA_URL",
  );
}
const describePg = canRunPg ? describe : describe.skip;

const TERM_ID = "pg-missing-term";
const OTHER_TERM_ID = "pg-missing-other-term";
const MAX_SEATS = 4;

type PreviewBody = {
  termId: string;
  missing: Array<{
    cityTown: string;
    legDistrict: number;
    electionDistrict: number;
    voterCount: number;
  }>;
  unknownTownCodes: string[];
};

describePg("Create missing committees (PostgreSQL)", () => {
  let prisma: PrismaClient;
  let get: typeof MissingGet;
  let post: typeof MissingPost;
  const request = new NextRequest(
    "http://localhost/api/admin/committees/missing",
  );
  const postRequest = (termId = TERM_ID) =>
    new NextRequest(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termId }),
    });

  beforeAll(async () => {
    ({ GET: get, POST: post } = await import(
      "~/app/api/admin/committees/missing/route"
    ));
    prisma = (await import("~/lib/prisma")).default;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  let voterSeq = 0;
  const seedVoters = async (
    count: number,
    voter: {
      townCode: string | null;
      L_T: string | null;
      electionDistrict: number | null;
    },
  ) => {
    await prisma.voterRecord.createMany({
      data: Array.from({ length: count }, () => ({
        VRCNUM: `PGMISS${String(++voterSeq).padStart(6, "0")}`,
        latestRecordEntryYear: 2026,
        latestRecordEntryNumber: 1,
        ...voter,
      })),
    });
  };

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE
        "AuditLog",
        "Seat",
        "CommitteeList",
        "CommitteeTerm",
        "CommitteeGovernanceConfig",
        "VoterRecord",
        "User"
      CASCADE`,
    );
    await prisma.user.create({
      data: {
        id: "pg-admin",
        email: "pg-admin@internal",
        name: "PG Admin",
        privilegeLevel: PrivilegeLevel.Admin,
      },
    });
    for (const [id, isActive] of [
      [TERM_ID, true],
      [OTHER_TERM_ID, false],
    ] as const) {
      await prisma.committeeTerm.create({
        data: {
          id,
          label: id,
          startDate: new Date("2026-01-01"),
          endDate: new Date("2028-12-31"),
          isActive,
        },
      });
    }
    await prisma.committeeGovernanceConfig.create({
      data: {
        id: "pg-missing-governance",
        requiredPartyCode: "DEM",
        maxSeatsPerLted: MAX_SEATS,
        requireAssemblyDistrictMatch: false,
        nonOverridableIneligibilityReasons: [],
      },
    });

    // Rochester LD 17: ED 1 already has a committee, ED 2 doesn't.
    await seedVoters(3, { townCode: "080", L_T: "17", electionDistrict: 1 });
    await seedVoters(2, { townCode: "080", L_T: "17", electionDistrict: 2 });
    // Greece LD "05" with a leading zero; only has a committee in the other term.
    await seedVoters(1, { townCode: "025", L_T: "05", electionDistrict: 7 });
    // Not a Monroe town code; skipped.
    await seedVoters(1, { townCode: "999", L_T: "1", electionDistrict: 1 });
    // Incomplete district data; ignored.
    await seedVoters(1, { townCode: "080", L_T: null, electionDistrict: 3 });
    await seedVoters(1, { townCode: "080", L_T: "X", electionDistrict: 3 });
    await seedVoters(1, { townCode: "080", L_T: "17", electionDistrict: null });

    await prisma.committeeList.create({
      data: {
        cityTown: "ROCHESTER",
        legDistrict: 17,
        electionDistrict: 1,
        termId: TERM_ID,
      },
    });
    await prisma.committeeList.create({
      data: {
        cityTown: "GREECE",
        legDistrict: 5,
        electionDistrict: 7,
        termId: OTHER_TERM_ID,
      },
    });
  });

  it("previews voter-file EDs with no committee in the active term", async () => {
    const response = await get(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as PreviewBody;

    expect(body.termId).toBe(TERM_ID);
    expect(body.missing).toEqual([
      {
        cityTown: "GREECE",
        legDistrict: 5,
        electionDistrict: 7,
        voterCount: 1,
      },
      {
        cityTown: "ROCHESTER",
        legDistrict: 17,
        electionDistrict: 2,
        voterCount: 2,
      },
    ]);
    expect(body.unknownTownCodes).toEqual(["999"]);
  });

  it("rejects a preview from a different active term without writes", async () => {
    const response = await post(postRequest(OTHER_TERM_ID));
    expect(response.status).toBe(409);
    expect(await prisma.committeeList.count()).toBe(2);
    expect(await prisma.seat.count()).toBe(0);
    expect(await prisma.auditLog.count()).toBe(0);
  });

  it("creates the missing committees with empty seats, once", async () => {
    const response = await post(postRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      committeesCreated: 2,
      seatsCreated: 2 * MAX_SEATS,
    });

    const created = await prisma.committeeList.findMany({
      where: { termId: TERM_ID },
      orderBy: [{ cityTown: "asc" }, { electionDistrict: "asc" }],
      select: {
        cityTown: true,
        legDistrict: true,
        electionDistrict: true,
        _count: { select: { seats: true } },
      },
    });
    expect(created).toEqual([
      {
        cityTown: "GREECE",
        legDistrict: 5,
        electionDistrict: 7,
        _count: { seats: MAX_SEATS },
      },
      // The pre-existing committee is left as it was.
      {
        cityTown: "ROCHESTER",
        legDistrict: 17,
        electionDistrict: 1,
        _count: { seats: 0 },
      },
      {
        cityTown: "ROCHESTER",
        legDistrict: 17,
        electionDistrict: 2,
        _count: { seats: MAX_SEATS },
      },
    ]);

    const audit = await prisma.auditLog.findMany({
      where: { action: "MISSING_COMMITTEES_CREATED" },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      userId: "pg-admin",
      entityType: "CommitteeList",
    });

    // Running it again finds nothing and writes nothing.
    const again = await post(postRequest());
    expect(await again.json()).toMatchObject({
      committeesCreated: 0,
      seatsCreated: 0,
    });
    expect(
      await prisma.auditLog.count({
        where: { action: "MISSING_COMMITTEES_CREATED" },
      }),
    ).toBe(1);
    const preview = (await (await get(request)).json()) as PreviewBody;
    expect(preview.missing).toEqual([]);
  });

  it("gives seats it creates the committee's LTED weight (the per-seat weight)", async () => {
    const { createCommittees } = await import(
      "~/lib/committees/missingCommittees"
    );
    // ROCHESTER 17-001 exists in the term with no seats; give it a weight.
    await prisma.committeeList.updateMany({
      where: { termId: TERM_ID, legDistrict: 17, electionDistrict: 1 },
      data: { ltedWeight: "128.5" },
    });

    const counts = await prisma.$transaction((tx) =>
      createCommittees(
        tx,
        TERM_ID,
        [
          { cityTown: "ROCHESTER", legDistrict: 17, electionDistrict: 1 },
          { cityTown: "ROCHESTER", legDistrict: 17, electionDistrict: 2 },
        ],
        MAX_SEATS,
      ),
    );
    expect(counts).toEqual({ committeesCreated: 1, seatsCreated: 2 * MAX_SEATS });

    const seats = await prisma.seat.findMany({
      where: { termId: TERM_ID },
      select: { committeeList: { select: { electionDistrict: true } }, weight: true },
    });
    const weightsByEd = (ed: number) =>
      seats
        .filter((seat) => seat.committeeList.electionDistrict === ed)
        .map((seat) => seat.weight?.toString() ?? null);
    expect(weightsByEd(1)).toEqual(Array(MAX_SEATS).fill("128.5"));
    expect(weightsByEd(2)).toEqual(Array(MAX_SEATS).fill(null));
  });
});
