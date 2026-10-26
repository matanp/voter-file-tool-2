/**
 * PostgreSQL-backed proof that the bulk LTED imports write what they claim. The
 * unit tests mock $executeRaw, so only a real database can catch a bad column
 * name, cast, or a Prisma array binding (e.g. an all-null text[] column).
 *
 * Run with `pnpm --filter voter-file-tool test:pg`. Skips when there is no
 * local test database URL (see jest.pg.env.cjs).
 */
import { PrivilegeLevel, type PrismaClient } from "@prisma/client";
import * as xlsx from "xlsx";
import type { NextRequest } from "next/server";
import type { POST as CrosswalkPost } from "~/app/api/admin/crosswalk/import/route";
import type { POST as WeightedPost } from "~/app/api/admin/weightedTable/import/route";

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

const TERM_ID = "pg-lted-term";
const MAX_SEATS = 3;

/** A multipart request whose fields are in-memory .xlsx workbooks. */
function uploadRequest(
  files: Record<string, { sheetName: string; rows: Record<string, unknown>[] }>,
): NextRequest {
  const uploads = Object.fromEntries(
    Object.entries(files).map(([field, { sheetName, rows }]) => {
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(rows), sheetName);
      const buf = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
      return [
        field,
        {
          arrayBuffer: async () =>
            buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        },
      ];
    }),
  );
  return {
    formData: async () => ({ get: (key: string) => uploads[key] ?? null }),
  } as unknown as NextRequest;
}

describePg("LTED imports (PostgreSQL)", () => {
  let prisma: PrismaClient;
  let crosswalkPost: typeof CrosswalkPost;
  let weightedPost: typeof WeightedPost;

  beforeAll(async () => {
    ({ POST: crosswalkPost } = await import("~/app/api/admin/crosswalk/import/route"));
    ({ POST: weightedPost } = await import("~/app/api/admin/weightedTable/import/route"));
    prisma = (await import("~/lib/prisma")).default;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE
        "AuditLog",
        "Seat",
        "CommitteeList",
        "CommitteeTerm",
        "CommitteeGovernanceConfig",
        "LtedDistrictCrosswalk",
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
  });

  describe("crosswalk import", () => {
    const matrix = (rows: Record<string, unknown>[]) =>
      uploadRequest({ file: { sheetName: "NEW_LTED_Matrix", rows } });

    it("creates, updates and leaves unchanged rows, including all-null columns", async () => {
      const first = await crosswalkPost(
        matrix([
          { town: "080", ward: "17", district: "1", stleg_dist: "131", stsen_dist: "55" },
          { town: "080", ward: "17", district: "2", stleg_dist: "131", stsen_dist: "55" },
          { town: "080", ward: "17", district: "3", stleg_dist: "131", stsen_dist: "55" },
        ]),
      );
      expect(first.status).toBe(200);
      expect(((await first.json()) as { summary: unknown }).summary).toMatchObject({ created: 3, updated: 0 });

      // Every updated row has blank cong/othr districts, so those bind as all-null arrays.
      const second = await crosswalkPost(
        matrix([
          { town: "080", ward: "17", district: "1", stleg_dist: "131", stsen_dist: "55" },
          { town: "080", ward: "17", district: "2", stleg_dist: "136" },
          { town: "080", ward: "17", district: "3", stleg_dist: "137", stsen_dist: "56" },
          { town: "080", ward: "17", district: "4", stleg_dist: "138" },
        ]),
      );
      expect(second.status).toBe(200);
      expect(((await second.json()) as { summary: unknown }).summary).toMatchObject({
        created: 1,
        updated: 2,
        unchanged: 1,
      });

      const stored = await prisma.ltedDistrictCrosswalk.findMany({
        orderBy: { electionDistrict: "asc" },
        select: {
          electionDistrict: true,
          stateAssemblyDistrict: true,
          stateSenateDistrict: true,
          congressionalDistrict: true,
          countyLegDistrict: true,
        },
      });
      expect(stored).toEqual([
        { electionDistrict: 1, stateAssemblyDistrict: "131", stateSenateDistrict: "55", congressionalDistrict: null, countyLegDistrict: null },
        { electionDistrict: 2, stateAssemblyDistrict: "136", stateSenateDistrict: null, congressionalDistrict: null, countyLegDistrict: null },
        { electionDistrict: 3, stateAssemblyDistrict: "137", stateSenateDistrict: "56", congressionalDistrict: null, countyLegDistrict: null },
        { electionDistrict: 4, stateAssemblyDistrict: "138", stateSenateDistrict: null, congressionalDistrict: null, countyLegDistrict: null },
      ]);
      expect(
        await prisma.auditLog.count({ where: { action: "CROSSWALK_IMPORTED" } }),
      ).toBe(2);
    });
  });

  describe("weighted table import", () => {
    const weightedTable = (rows: Record<string, unknown>[]) =>
      uploadRequest({ weightedTable: { sheetName: "Weighted", rows } });

    let weightedId: number;
    let clearedId: number;

    beforeEach(async () => {
      await prisma.committeeTerm.create({
        data: {
          id: TERM_ID,
          label: "PG LTED term",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2028-12-31"),
          isActive: true,
        },
      });
      await prisma.committeeGovernanceConfig.create({
        data: {
          id: "pg-lted-governance",
          requiredPartyCode: "DEM",
          maxSeatsPerLted: MAX_SEATS,
          requireAssemblyDistrictMatch: true,
          nonOverridableIneligibilityReasons: [],
        },
      });
      const committee = (electionDistrict: number, ltedWeight: number | null) =>
        prisma.committeeList.create({
          data: {
            cityTown: "ROCHESTER",
            legDistrict: 17,
            electionDistrict,
            termId: TERM_ID,
            ltedWeight,
            seats: {
              create: Array.from({ length: MAX_SEATS }, (_, i) => ({
                termId: TERM_ID,
                seatNumber: i + 1,
              })),
            },
          },
        });
      weightedId = (await committee(1, null)).id;
      clearedId = (await committee(2, 42)).id;
    });

    const storedWeights = async (id: number) => {
      const row = await prisma.committeeList.findUniqueOrThrow({
        where: { id },
        select: { ltedWeight: true, seats: { select: { weight: true } } },
      });
      return {
        ltedWeight: row.ltedWeight?.toString() ?? null,
        seatWeights: row.seats.map((seat) => seat.weight?.toString() ?? null),
      };
    };

    it("sets committee and seat weights, and clears them for a blank weight", async () => {
      const response = await weightedPost(
        weightedTable([
          { LTED: "17001", "Weighted Vote": 100 },
          { LTED: "17002" },
        ]),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ matched: 2 });

      // Same Decimal division as recomputeSeatWeights: 100 / 3 to 20 significant digits.
      expect(await storedWeights(weightedId)).toEqual({
        ltedWeight: "100",
        seatWeights: Array(MAX_SEATS).fill("33.333333333333333333"),
      });
      expect(await storedWeights(clearedId)).toEqual({
        ltedWeight: null,
        seatWeights: Array(MAX_SEATS).fill(null),
      });
    });

    it("binds an all-null weight column", async () => {
      const response = await weightedPost(
        weightedTable([{ LTED: "17002" }]),
      );
      expect(response.status).toBe(200);
      expect(await storedWeights(clearedId)).toEqual({
        ltedWeight: null,
        seatWeights: Array(MAX_SEATS).fill(null),
      });
    });
  });
});
