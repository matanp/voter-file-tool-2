/**
 * Tests for POST /api/admin/bulkLoadCommittees.
 *
 * The Admin names the format and the file and says whether to write: a dry run returns
 * the plan and touches nothing, `dryRun: false` applies it. Planning and applying are
 * mocked here; their behaviour is covered by the importer's own tests.
 */
import * as fs from "fs";
import { POST } from "~/app/api/admin/bulkLoadCommittees/route";
import { PrivilegeLevel, type MembershipType } from "@prisma/client";
import {
  createMockRequest,
  createMockSession,
  createMockVoterRecord,
  createAuthTestSuite,
  selectedRow,
  parseJsonResponse,
  expectErrorResponse,
  type AuthTestConfig,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";
import { DEFAULT_ACTIVE_TERM_ID } from "../../utils/testUtils";
import * as committeeValidation from "~/app/api/lib/committeeValidation";

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
  planRosterImport: (...args: unknown[]): unknown =>
    planRosterImportMock(...args),
  applyRosterImport: (...args: unknown[]): unknown =>
    applyRosterImportMock(...args),
}));

const existsSyncMock = jest.mocked(fs.existsSync);
const readFileSyncMock = jest.mocked(fs.readFileSync);
const getActiveTermIdMock = jest.mocked(committeeValidation.getActiveTermId);

type PlannedRemoval = {
  membershipId: string;
  voterRecordId: string;
  name: string;
  committee: unknown;
};

type BulkLoadCommitteesResponse = {
  success: boolean;
  message: string;
  dryRun: boolean;
  applied: boolean;
  format: string;
  fileName: string;
  counts: {
    entries: number;
    matchedVoters: number;
    activations: number;
    removals: number;
    discrepancies: number;
    rejectedRows: number;
  };
  removals: PlannedRemoval[];
  capacityFailures: {
    committee: string;
    memberCount: number;
    maxSeats: number;
  }[];
  discrepanciesMap: [string, { discrepancies: unknown; committee: unknown }][];
  recordsWithDiscrepancies: unknown[];
  rejectedRows: { sourceRow: number; reason: string }[];
};

type MockPlan = {
  term: { id: string; label: string };
  maxSeatsPerLted: number;
  committees: unknown[];
  activations: {
    voterRecordId: string;
    committee: unknown;
    membershipType: MembershipType;
  }[];
  removals: PlannedRemoval[];
  discrepancies: Map<string, { discrepancies: unknown; committee: unknown }>;
  rejectedRows: { sourceRow: number; reason: string }[];
  capacityFailures: {
    committee: string;
    memberCount: number;
    maxSeats: number;
  }[];
  counts: BulkLoadCommitteesResponse["counts"];
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
const importPlan = (overrides: Partial<MockPlan> = {}): MockPlan => {
  const discrepancies: MockPlan["discrepancies"] =
    overrides.discrepancies ??
    new Map<string, { discrepancies: unknown; committee: unknown }>();
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
) => ({
  discrepancies: { name: { incoming: "New Name", existing: "Old Name" } },
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

const authenticateAdmin = () => {
  mockAuthSession(
    createMockSession({
      user: { id: "1", privilegeLevel: PrivilegeLevel.Admin },
    }),
  );
  mockHasPermission(true);
};

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
      const json = (await response.json()) as { error: string };
      expect(json.error).toBe("Not available in this environment");
      expect(planRosterImportMock).not.toHaveBeenCalled();
      expect(applyRosterImportMock).not.toHaveBeenCalled();
    });

    it("returns the plan and writes nothing for a dry run", async () => {
      authenticateAdmin();

      const response = await POST(importRequest({ dryRun: true }));

      expect(response.status).toBe(200);
      const json =
        await parseJsonResponse<BulkLoadCommitteesResponse>(response);
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

      const json =
        await parseJsonResponse<BulkLoadCommitteesResponse>(response);
      expect(json.dryRun).toBe(true);
      expect(planRosterImportMock).toHaveBeenCalledTimes(1);
      expect(applyRosterImportMock).not.toHaveBeenCalled();
      expect(
        prismaMock.committeeUploadDiscrepancy.deleteMany,
      ).not.toHaveBeenCalled();
    });

    it("reads the named file from the data directory with the named format", async () => {
      authenticateAdmin();

      await POST(importRequest());

      const readPath = (
        readFileSyncMock.mock.calls as unknown[][]
      )[0]?.[0] as string;
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
        createMockVoterRecord({ VRCNUM: "VRCNUM1" }),
        createMockVoterRecord({ VRCNUM: "VRCNUM2" }),
      ]);

      const response = await POST(importRequest({ dryRun: false }));

      expect(response.status).toBe(200);
      const json =
        await parseJsonResponse<BulkLoadCommitteesResponse>(response);
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
      const json =
        await parseJsonResponse<BulkLoadCommitteesResponse>(response);
      expect(json.discrepanciesMap).toHaveLength(1);
      expect(prismaMock.committeeUploadDiscrepancy.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { VRCNUM: "VRCNUM_NOT_IN_DB" },
          update: expect.objectContaining({
            resolvedAt: null,
            resolution: null,
          }) as unknown,
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

        const json =
          await parseJsonResponse<BulkLoadCommitteesResponse>(response);
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

      const json =
        await parseJsonResponse<BulkLoadCommitteesResponse>(response);
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
      const json = await parseJsonResponse<{
        success: boolean;
        error: string;
      }>(response);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid request data");
      expect(readFileSyncMock).not.toHaveBeenCalled();
      expect(planRosterImportMock).not.toHaveBeenCalled();
    });

    it("rejects an archived format, naming it as archived", async () => {
      authenticateAdmin();

      const response = await POST(importRequest({ format: ARCHIVED_FORMAT }));

      expect(response.status).toBe(422);
      const json = await parseJsonResponse<{
        success: boolean;
        error: string;
      }>(response);
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
      const json = await parseJsonResponse<{
        success: boolean;
        error: string;
      }>(response);
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
      const json = await parseJsonResponse<{
        success: boolean;
        error: string;
      }>(response);
      expect(json.success).toBe(false);
      expect(json.error).toContain(FILE_NAME);
      expect(readFileSyncMock).not.toHaveBeenCalled();
      expect(planRosterImportMock).not.toHaveBeenCalled();
    });

    it("returns 503 when there is no active committee term", async () => {
      getActiveTermIdMock.mockRejectedValue(new Error("No active term"));
      authenticateAdmin();

      await expectErrorResponse(
        await POST(importRequest()),
        503,
        "No active committee term. Create one in Admin > Terms first.",
      );
      expect(planRosterImportMock).not.toHaveBeenCalled();
    });

    it("failed load leaves unresolved discrepancies intact", async () => {
      applyRosterImportMock.mockRejectedValue(new Error("Unreadable file"));
      authenticateAdmin();

      await expectErrorResponse(
        await POST(importRequest({ dryRun: false })),
        500,
        "Error loading committee lists",
      );
      expect(
        prismaMock.committeeUploadDiscrepancy.deleteMany,
      ).not.toHaveBeenCalled();
    });
  });
});
