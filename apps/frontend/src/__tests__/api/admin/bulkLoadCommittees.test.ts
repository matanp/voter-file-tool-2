/**
 * Tests for POST /api/admin/bulkLoadCommittees.
 *
 * The Admin names the format and the file and says whether to write: a dry run returns
 * the plan and touches nothing, `dryRun: false` applies it. Planning and applying are
 * mocked here; their behaviour is covered by the importer's own tests.
 */
import * as fs from "fs";
import { POST } from "~/app/api/admin/bulkLoadCommittees/route";
import {
  Prisma,
  PrivilegeLevel,
  type MembershipType,
  type VoterRecord,
} from "@prisma/client";
import {
  bulkLoadCommitteesErrorSchema,
  bulkLoadCommitteesResponseSchema,
  voterRecordSchema,
} from "@voter-file-tool/shared-validators";
import {
  authenticateAsAdmin,
  createMockRequest,
  createMockVoterRecord,
  createAuthTestSuite,
  objectContainingMatcher,
  selectedRow,
  parseJsonResponseWith,
  type AuthTestConfig,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";
import { DEFAULT_ACTIVE_TERM_ID } from "../../utils/testUtils";
import * as committeeValidation from "~/app/api/lib/committeeValidation";
import { RosterCapacityError } from "~/app/api/admin/bulkLoadCommittees/bulkLoadUtils";
import type {
  ImportPlan,
  PlannedRemoval,
} from "~/app/api/admin/bulkLoadCommittees/bulkLoadUtils";
import type { DiscrepanciesAndCommittee } from "~/app/api/lib/utils";

jest.mock("fs", () => ({
  ...jest.requireActual<typeof import("fs")>("fs"),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock("~/app/api/lib/committeeValidation", () => {
  const actual = jest.requireActual<
    typeof import("~/app/api/lib/committeeValidation")
  >("~/app/api/lib/committeeValidation");
  return { ...actual, getActiveTermId: jest.fn() };
});

const parseWithFormatMock = jest.fn();
jest.mock("~/app/api/admin/bulkLoadCommittees/rosterFormats", () => {
  const actual = jest.requireActual<
    typeof import("~/app/api/admin/bulkLoadCommittees/rosterFormats")
  >("~/app/api/admin/bulkLoadCommittees/rosterFormats");
  return {
    ...actual,
    parseWithFormat: (...args: unknown[]): unknown =>
      parseWithFormatMock(...args),
  };
});

const planRosterImportMock = jest.fn();
const applyRosterImportMock = jest.fn();
jest.mock("~/app/api/admin/bulkLoadCommittees/bulkLoadUtils", () => ({
  // The real class, so the route's `instanceof` check sees what the importer throws.
  RosterCapacityError: jest.requireActual<
    typeof import("~/app/api/admin/bulkLoadCommittees/bulkLoadUtils")
  >("~/app/api/admin/bulkLoadCommittees/bulkLoadUtils").RosterCapacityError,
  planRosterImport: (...args: unknown[]): unknown =>
    planRosterImportMock(...args),
  applyRosterImport: (...args: unknown[]): unknown =>
    applyRosterImportMock(...args),
}));

const existsSyncMock = jest.mocked(fs.existsSync);
const readFileSyncMock = jest.mocked(fs.readFileSync);
const getActiveTermIdMock = jest.mocked(committeeValidation.getActiveTermId);

/**
 * `prisma.voterRecord.findMany` hands back whole rows — every column present, absent
 * values null — and the response schema names them all, so a fixture that fills only the
 * interesting columns would not parse. The rest are spelled out from the schema itself.
 */
const voterRecordRow = (overrides: Partial<VoterRecord> = {}): VoterRecord => {
  const allColumnsNull = Object.fromEntries(
    Object.keys(voterRecordSchema.shape).map((column) => [column, null]),
  );
  return {
    ...allColumnsNull,
    ...createMockVoterRecord(overrides),
  } as VoterRecord;
};

const CURRENT_FORMAT = "boe-elected-list";
const ARCHIVED_FORMAT = "committee-export-xlsx";
const FILE_NAME = "Elected County Committee List.csv";

const importRequest = (overrides: Record<string, unknown> = {}) =>
  createMockRequest({
    format: CURRENT_FORMAT,
    fileName: FILE_NAME,
    ...overrides,
  });

/** What planning or applying reports back: the plan, as data. */
const importPlan = (overrides: Partial<ImportPlan> = {}): ImportPlan => {
  const discrepancies: ImportPlan["discrepancies"] =
    overrides.discrepancies ?? new Map<string, DiscrepanciesAndCommittee>();
  const removals = overrides.removals ?? [];
  const rejectedRows = overrides.rejectedRows ?? [];
  return {
    term: { id: DEFAULT_ACTIVE_TERM_ID, label: "2024–2026" },
    maxSeatsPerLted: 4,
    committees: [],
    activations: [],
    capacityFailures: [],
    ...overrides,
    removals,
    discrepancies,
    rejectedRows,
    counts: overrides.counts ?? {
      entries: 3,
      matchedVoters: 3,
      activations: 2,
      removals: removals.length,
      discrepancies: discrepancies.size,
      rejectedRows: rejectedRows.length,
    },
  };
};

const plannedRemoval = (voterRecordId: string): PlannedRemoval => ({
  membershipId: `membership-${voterRecordId}`,
  voterRecordId,
  name: "Pat Q Sample",
  committee: {
    cityTown: "ROCHESTER",
    legDistrict: 1,
    electionDistrict: 1,
    termId: DEFAULT_ACTIVE_TERM_ID,
  },
});

const createDiscrepancyEntry = (
  VRCNUM: string,
  committee: {
    cityTown: string;
    legDistrict: number;
    electionDistrict: number;
  },
  incomingMembershipType: MembershipType | null = "PETITIONED",
): DiscrepanciesAndCommittee => ({
  discrepancies: { name: { incoming: "New Name", existing: "Old Name" } },
  incomingMembershipType,
  committee: {
    id: 0,
    cityTown: committee.cityTown,
    legDistrict: committee.legDistrict,
    electionDistrict: committee.electionDistrict,
    termId: DEFAULT_ACTIVE_TERM_ID,
    ltedWeight: null,
  },
});

/**
 * The route ignores the row an upsert returns; only that it was called matters,
 * so the fixture carries just the columns a reader would look for.
 */
const upsertedDiscrepancy = (VRCNUM: string) =>
  selectedRow<{ id: string; VRCNUM: string; committeeId: number }>({
    id: "cuid-1",
    VRCNUM,
    committeeId: 1,
  });

const authenticateAdmin = () => authenticateAsAdmin("1");

describe("/api/admin/bulkLoadCommittees", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.VERCEL;

    getActiveTermIdMock.mockResolvedValue(DEFAULT_ACTIVE_TERM_ID);
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(Buffer.from("roster bytes"));
    parseWithFormatMock.mockReturnValue({ entries: [], rejected: [] });
    planRosterImportMock.mockResolvedValue(importPlan());
    applyRosterImportMock.mockResolvedValue(importPlan());
    prismaMock.committeeUploadDiscrepancy.deleteMany.mockResolvedValue({
      count: 0,
    });
    prismaMock.voterRecord.findMany.mockResolvedValue([]);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("POST /api/admin/bulkLoadCommittees", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/admin/bulkLoadCommittees",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () => importRequest(),
      };

      const setupMocks = () => {
        prismaMock.committeeUploadDiscrepancy.deleteMany.mockResolvedValue({
          count: 0,
        });
        prismaMock.voterRecord.findMany.mockResolvedValue([]);
      };

      const authTestSuite = createAuthTestSuite(
        authConfig,
        POST,
        mockAuthSession,
        mockHasPermission,
        setupMocks,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

    it("returns error when VERCEL env is set (blocks file-based load)", async () => {
      process.env.VERCEL = "1";
      authenticateAdmin();

      const response = await POST(importRequest());

      expect(response.status).toBe(200); // route returns 200 with error body
      const json = await parseJsonResponseWith(
        response,
        bulkLoadCommitteesErrorSchema,
      );
      expect(json.error).toBe("Not available in this environment");
      expect(planRosterImportMock).not.toHaveBeenCalled();
      expect(applyRosterImportMock).not.toHaveBeenCalled();
    });

    it("returns the plan and writes nothing for a dry run", async () => {
      authenticateAdmin();

      const response = await POST(importRequest({ dryRun: true }));

      expect(response.status).toBe(200);
      const json = await parseJsonResponseWith(
        response,
        bulkLoadCommitteesResponseSchema,
      );
      expect(json.dryRun).toBe(true);
      expect(json.applied).toBe(false);
      expect(planRosterImportMock).toHaveBeenCalledTimes(1);
      expect(applyRosterImportMock).not.toHaveBeenCalled();
      expect(
        prismaMock.committeeUploadDiscrepancy.deleteMany,
      ).not.toHaveBeenCalled();
      expect(
        prismaMock.committeeUploadDiscrepancy.upsert,
      ).not.toHaveBeenCalled();
    });

    it("treats an omitted dryRun as a dry run", async () => {
      authenticateAdmin();

      const response = await POST(importRequest());

      const json = await parseJsonResponseWith(
        response,
        bulkLoadCommitteesResponseSchema,
      );
      expect(json.dryRun).toBe(true);
      expect(planRosterImportMock).toHaveBeenCalledTimes(1);
      expect(applyRosterImportMock).not.toHaveBeenCalled();
      expect(
        prismaMock.committeeUploadDiscrepancy.deleteMany,
      ).not.toHaveBeenCalled();
    });

    it("serializes Prisma Decimal and Date values to their wire strings", async () => {
      const discrepancy = createDiscrepancyEntry("VRCNUM1", {
        cityTown: "ROCHESTER",
        legDistrict: 1,
        electionDistrict: 1,
      });
      discrepancy.committee.ltedWeight = new Prisma.Decimal("12.5");
      planRosterImportMock.mockResolvedValue(
        importPlan({ discrepancies: new Map([["VRCNUM1", discrepancy]]) }),
      );
      prismaMock.voterRecord.findMany.mockResolvedValue([
        voterRecordRow({
          VRCNUM: "VRCNUM1",
          DOB: new Date("1980-02-03T00:00:00.000Z"),
          lastUpdate: new Date("2026-08-09T10:11:12.000Z"),
          originalRegDate: new Date("2001-04-05T00:00:00.000Z"),
        }),
      ]);
      authenticateAdmin();

      const response = await POST(importRequest());

      expect(response.status).toBe(200);
      const json = await parseJsonResponseWith(
        response,
        bulkLoadCommitteesResponseSchema,
      );
      expect(json.discrepanciesMap[0]?.[1].committee.ltedWeight).toBe("12.5");
      expect(json.recordsWithDiscrepancies[0]).toMatchObject({
        DOB: "1980-02-03T00:00:00.000Z",
        lastUpdate: "2026-08-09T10:11:12.000Z",
        originalRegDate: "2001-04-05T00:00:00.000Z",
      });
    });

    it("reads the named file from the data directory with the named format", async () => {
      authenticateAdmin();

      await POST(importRequest());

      const readPath = String(readFileSyncMock.mock.calls[0]?.[0]);
      expect(readPath.endsWith(`data/${FILE_NAME}`)).toBe(true);
      expect(parseWithFormatMock).toHaveBeenCalledWith(
        CURRENT_FORMAT,
        expect.anything(),
      );
    });

    it("applies the import and writes the discrepancy records when dryRun is false", async () => {
      const discrepancies = new Map([
        [
          "VRCNUM1",
          createDiscrepancyEntry("VRCNUM1", {
            cityTown: "ROCHESTER",
            legDistrict: 1,
            electionDistrict: 1,
          }),
        ],
        [
          "VRCNUM2",
          createDiscrepancyEntry("VRCNUM2", {
            cityTown: "ROCHESTER",
            legDistrict: 1,
            electionDistrict: 2,
          }),
        ],
      ]);
      applyRosterImportMock.mockResolvedValue(importPlan({ discrepancies }));
      authenticateAdmin();
      prismaMock.committeeUploadDiscrepancy.upsert.mockResolvedValue(
        upsertedDiscrepancy("VRCNUM1"),
      );
      prismaMock.voterRecord.findMany.mockResolvedValue([
        voterRecordRow({ VRCNUM: "VRCNUM1" }),
        voterRecordRow({ VRCNUM: "VRCNUM2" }),
      ]);

      const response = await POST(importRequest({ dryRun: false }));

      expect(response.status).toBe(200);
      const json = await parseJsonResponseWith(
        response,
        bulkLoadCommitteesResponseSchema,
      );
      expect(json.applied).toBe(true);
      expect(json.dryRun).toBe(false);
      expect(json.message).toBe("Committee lists loaded successfully");
      expect(json.discrepanciesMap).toHaveLength(2);
      expect(json.recordsWithDiscrepancies).toHaveLength(2);
      expect(applyRosterImportMock).toHaveBeenCalledTimes(1);
      expect(planRosterImportMock).not.toHaveBeenCalled();
      expect(
        prismaMock.committeeUploadDiscrepancy.deleteMany,
      ).toHaveBeenCalledWith({ where: { resolvedAt: null } });
      expect(
        prismaMock.committeeUploadDiscrepancy.upsert,
      ).toHaveBeenCalledTimes(2);
      expect(prismaMock.committeeUploadDiscrepancy.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { VRCNUM: "VRCNUM1" },
          create: objectContainingMatcher({
            incomingMembershipType: "PETITIONED",
          }),
          update: objectContainingMatcher({
            incomingMembershipType: "PETITIONED",
          }),
        }),
      );
    });

    it("VRCNUM not found in DB: discrepancy still upserted (planning flags it)", async () => {
      const discrepancies = new Map([
        [
          "VRCNUM_NOT_IN_DB",
          createDiscrepancyEntry("VRCNUM_NOT_IN_DB", {
            cityTown: "ROCHESTER",
            legDistrict: 1,
            electionDistrict: 1,
          }),
        ],
      ]);
      applyRosterImportMock.mockResolvedValue(importPlan({ discrepancies }));
      authenticateAdmin();
      prismaMock.committeeUploadDiscrepancy.upsert.mockResolvedValue(
        upsertedDiscrepancy("VRCNUM_NOT_IN_DB"),
      );
      prismaMock.voterRecord.findMany.mockResolvedValue([]);

      const response = await POST(importRequest({ dryRun: false }));

      expect(response.status).toBe(200);
      const json = await parseJsonResponseWith(
        response,
        bulkLoadCommitteesResponseSchema,
      );
      expect(json.discrepanciesMap).toHaveLength(1);
      expect(prismaMock.committeeUploadDiscrepancy.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { VRCNUM: "VRCNUM_NOT_IN_DB" },
          update: objectContainingMatcher({
            resolvedAt: null,
            resolution: null,
          }),
        }),
      );
    });

    it.each([
      ["a dry run", true, planRosterImportMock],
      ["an applied import", false, applyRosterImportMock],
    ])(
      "reports counts, removals, discrepancies and rejected rows for %s",
      async (_label, dryRun, importMock) => {
        const discrepancies = new Map([
          [
            "VRCNUM1",
            createDiscrepancyEntry("VRCNUM1", {
              cityTown: "ROCHESTER",
              legDistrict: 1,
              electionDistrict: 1,
            }),
          ],
        ]);
        const removals = [plannedRemoval("VRCNUM_GONE")];
        const rejectedRows = [
          { sourceRow: 42, reason: 'Unrecognized election type: "Appointed"' },
        ];
        importMock.mockResolvedValue(
          importPlan({ discrepancies, removals, rejectedRows }),
        );
        authenticateAdmin();
        prismaMock.committeeUploadDiscrepancy.upsert.mockResolvedValue(
          upsertedDiscrepancy("VRCNUM_GONE"),
        );

        const response = await POST(importRequest({ dryRun }));

        const json = await parseJsonResponseWith(
          response,
          bulkLoadCommitteesResponseSchema,
        );
        expect(json.counts).toEqual({
          entries: 3,
          matchedVoters: 3,
          activations: 2,
          removals: 1,
          discrepancies: 1,
          rejectedRows: 1,
        });
        expect(json.removals).toEqual([
          expect.objectContaining({ voterRecordId: "VRCNUM_GONE" }),
        ]);
        expect(json.discrepanciesMap).toHaveLength(1);
        expect(json.rejectedRows).toEqual(rejectedRows);
      },
    );

    it("reports the capacity failures that would stop the import", async () => {
      planRosterImportMock.mockResolvedValue(
        importPlan({
          capacityFailures: [
            { committee: "ROCHESTER-1-1", memberCount: 6, maxSeats: 4 },
          ],
        }),
      );
      authenticateAdmin();

      const response = await POST(importRequest());

      const json = await parseJsonResponseWith(
        response,
        bulkLoadCommitteesResponseSchema,
      );
      expect(json.capacityFailures).toEqual([
        { committee: "ROCHESTER-1-1", memberCount: 6, maxSeats: 4 },
      ]);
    });

    it("rejects a format it does not know without reading a file", async () => {
      authenticateAdmin();

      const response = await POST(
        importRequest({ format: "democratic-committee-export" }),
      );

      expect(response.status).toBe(422);
      const json = await parseJsonResponseWith(
        response,
        bulkLoadCommitteesErrorSchema,
      );
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid request data");
      expect(readFileSyncMock).not.toHaveBeenCalled();
      expect(planRosterImportMock).not.toHaveBeenCalled();
    });

    it("rejects an archived format, naming it as archived", async () => {
      authenticateAdmin();

      const response = await POST(importRequest({ format: ARCHIVED_FORMAT }));

      expect(response.status).toBe(422);
      const json = await parseJsonResponseWith(
        response,
        bulkLoadCommitteesErrorSchema,
      );
      expect(json.success).toBe(false);
      expect(json.error).toContain(ARCHIVED_FORMAT);
      expect(json.error).toContain("archived");
      expect(readFileSyncMock).not.toHaveBeenCalled();
      expect(planRosterImportMock).not.toHaveBeenCalled();
    });

    it.each([
      "../secrets.csv",
      "nested/roster.csv",
      "/etc/passwd",
      "..\\secrets.csv",
    ])("rejects the file name %p without reading a file", async (fileName) => {
      authenticateAdmin();

      const response = await POST(importRequest({ fileName }));

      expect(response.status).toBe(422);
      const json = await parseJsonResponseWith(
        response,
        bulkLoadCommitteesErrorSchema,
      );
      expect(json.success).toBe(false);
      expect(json.error).toContain("data");
      expect(existsSyncMock).not.toHaveBeenCalled();
      expect(readFileSyncMock).not.toHaveBeenCalled();
      expect(planRosterImportMock).not.toHaveBeenCalled();
    });

    it("returns a clear error when the named file is not in the data directory", async () => {
      existsSyncMock.mockReturnValue(false);
      authenticateAdmin();

      const response = await POST(importRequest());

      expect(response.status).toBe(404);
      const json = await parseJsonResponseWith(
        response,
        bulkLoadCommitteesErrorSchema,
      );
      expect(json.success).toBe(false);
      expect(json.error).toContain(FILE_NAME);
      expect(readFileSyncMock).not.toHaveBeenCalled();
      expect(planRosterImportMock).not.toHaveBeenCalled();
    });

    it("returns 503 when there is no active committee term", async () => {
      getActiveTermIdMock.mockRejectedValue(new Error("No active term"));
      authenticateAdmin();

      const response = await POST(importRequest());

      expect(response.status).toBe(503);
      const json = await parseJsonResponseWith(
        response,
        bulkLoadCommitteesErrorSchema,
      );
      expect(json.error).toBe(
        "No active committee term. Create one in Admin > Terms first.",
      );
      expect(planRosterImportMock).not.toHaveBeenCalled();
    });

    it("refuses to apply an over-capacity plan with a structured 422", async () => {
      const capacityFailures = [
        { committee: "ROCHESTER-1-1", memberCount: 6, maxSeats: 4 },
        { committee: "BRIGHTON-2-3", memberCount: 5, maxSeats: 4 },
      ];
      applyRosterImportMock.mockRejectedValue(
        new RosterCapacityError(capacityFailures),
      );
      authenticateAdmin();

      const response = await POST(importRequest({ dryRun: false }));

      expect(response.status).toBe(422);
      const json = await parseJsonResponseWith(
        response,
        bulkLoadCommitteesErrorSchema,
      );
      expect(json.success).toBe(false);
      expect(json.error).toContain("ROCHESTER-1-1");
      expect(json.capacityFailures).toEqual(capacityFailures);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(
        prismaMock.committeeUploadDiscrepancy.deleteMany,
      ).not.toHaveBeenCalled();
    });

    it("failed load leaves unresolved discrepancies intact", async () => {
      applyRosterImportMock.mockRejectedValue(new Error("Unreadable file"));
      authenticateAdmin();

      const response = await POST(importRequest({ dryRun: false }));

      expect(response.status).toBe(500);
      const json = await parseJsonResponseWith(
        response,
        bulkLoadCommitteesErrorSchema,
      );
      expect(json.error).toBe("Error loading committee lists");
      expect(
        prismaMock.committeeUploadDiscrepancy.deleteMany,
      ).not.toHaveBeenCalled();
    });
  });
});
