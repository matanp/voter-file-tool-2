/**
 * Tests for POST /api/admin/bulkLoadCommittees.
 * Route reads from file via loadCommitteeLists (mocked); no JSON payload.
 * T1.3 acceptance: auth, empty load, import with discrepancies, VRCNUM not found, VERCEL block.
 *
 * TODO: Ticket "payload with no discrepancies array" does not apply — route has no payload,
 * reads committee data from file via loadCommitteeLists.
 */
import { POST } from "~/app/api/admin/bulkLoadCommittees/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockRequest,
  createAuthTestSuite,
  parseJsonResponse,
  expectErrorResponse,
  type AuthTestConfig,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";
import { DEFAULT_ACTIVE_TERM_ID } from "../../utils/testUtils";

type BulkLoadCommitteesResponse = {
  success: boolean;
  message: string;
  discrepanciesMap: [string, { discrepancies: unknown; committee: unknown }][];
  recordsWithDiscrepancies: unknown[];
};

const loadCommitteeListsMock = jest.fn();

jest.mock("~/app/api/admin/bulkLoadCommittees/bulkLoadUtils", () => ({
  loadCommitteeLists: (
    ...args: unknown[]
  ): Promise<Map<string, { discrepancies: unknown; committee: unknown }>> =>
    loadCommitteeListsMock(...args) as Promise<
      Map<string, { discrepancies: unknown; committee: unknown }>
    >,
}));

const createDiscrepancyEntry = (
  VRCNUM: string,
  committee: { cityTown: string; legDistrict: number; electionDistrict: number },
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

describe("/api/admin/bulkLoadCommittees", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    loadCommitteeListsMock.mockResolvedValue(new Map());
    process.env = { ...originalEnv };
    delete process.env.VERCEL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("POST /api/admin/bulkLoadCommittees", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/admin/bulkLoadCommittees",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () => createMockRequest({}),
      };

      const setupMocks = () => {
        prismaMock.committeeUploadDiscrepancy.deleteMany.mockResolvedValue(
          {} as never,
        );
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
      mockAuthSession({
        user: { id: "1", privilegeLevel: PrivilegeLevel.Admin },
      } as never);
      mockHasPermission(true);

      const response = await POST(createMockRequest({}));

      expect(response.status).toBe(200); // route returns 200 with error body
      const json = (await response.json()) as { error: string };
      expect(json.error).toBe("Not available in this environment");
      expect(loadCommitteeListsMock).not.toHaveBeenCalled();
    });

    it("returns success when loadCommitteeLists returns empty Map (no discrepancies)", async () => {
      loadCommitteeListsMock.mockResolvedValue(new Map());
      mockAuthSession({
        user: { id: "1", privilegeLevel: PrivilegeLevel.Admin },
      } as never);
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.deleteMany.mockResolvedValue(
        {} as never,
      );
      prismaMock.voterRecord.findMany.mockResolvedValue([]);
      (prismaMock.$transaction as jest.Mock).mockImplementation(
        async (arg: unknown): Promise<unknown[]> =>
          Array.isArray(arg) ? (arg as unknown[]) : [],
      );

      const response = await POST(createMockRequest({}));

      expect(response.status).toBe(200);
      const json = await parseJsonResponse<BulkLoadCommitteesResponse>(
        response,
      );
      expect(json.success).toBe(true);
      expect(json.message).toBe("Committee lists loaded successfully");
      expect(json.discrepanciesMap).toEqual([]);
      expect(json.recordsWithDiscrepancies).toEqual([]);
      expect(prismaMock.committeeUploadDiscrepancy.create).not.toHaveBeenCalled();
    });

    it("creates CommitteeUploadDiscrepancy records when loadCommitteeLists returns discrepancies", async () => {
      const discrepanciesMap = new Map([
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
      loadCommitteeListsMock.mockResolvedValue(discrepanciesMap);
      mockAuthSession({
        user: { id: "1", privilegeLevel: PrivilegeLevel.Admin },
      } as never);
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.deleteMany.mockResolvedValue(
        {} as never,
      );
      prismaMock.committeeUploadDiscrepancy.create.mockResolvedValue({
        id: "cuid-1",
        VRCNUM: "VRCNUM1",
        committeeId: 1,
        discrepancy: {},
      } as never);
      prismaMock.voterRecord.findMany.mockResolvedValue([
        { VRCNUM: "VRCNUM1" },
        { VRCNUM: "VRCNUM2" },
      ] as never);
      (prismaMock.$transaction as jest.Mock).mockImplementation(
        async (arg: unknown): Promise<unknown[]> =>
          Array.isArray(arg) ? (arg as unknown[]) : [],
      );

      const response = await POST(createMockRequest({}));

      expect(response.status).toBe(200);
      const json = await parseJsonResponse<BulkLoadCommitteesResponse>(
        response,
      );
      expect(json.success).toBe(true);
      expect(json.discrepanciesMap).toHaveLength(2);
      expect(prismaMock.committeeUploadDiscrepancy.create).toHaveBeenCalledTimes(
        2,
      );
    });

    it("VRCNUM not found in DB: discrepancy still created (bulkLoadUtils flags as discrepancy)", async () => {
      // bulkLoadUtils sets discrepancy { VRCNUM: { incoming, existing: "" } } when voter not in DB
      const discrepanciesMap = new Map([
        [
          "VRCNUM_NOT_IN_DB",
          createDiscrepancyEntry("VRCNUM_NOT_IN_DB", {
            cityTown: "ROCHESTER",
            legDistrict: 1,
            electionDistrict: 1,
          }),
        ],
      ]);
      loadCommitteeListsMock.mockResolvedValue(discrepanciesMap);
      mockAuthSession({
        user: { id: "1", privilegeLevel: PrivilegeLevel.Admin },
      } as never);
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.deleteMany.mockResolvedValue(
        {} as never,
      );
      prismaMock.committeeUploadDiscrepancy.create.mockResolvedValue({
        id: "cuid-1",
        VRCNUM: "VRCNUM_NOT_IN_DB",
        committeeId: 1,
        discrepancy: {},
      } as never);
      prismaMock.voterRecord.findMany.mockResolvedValue([]);
      (prismaMock.$transaction as jest.Mock).mockImplementation(
        async (arg: unknown): Promise<unknown[]> =>
          Array.isArray(arg) ? (arg as unknown[]) : [],
      );

      const response = await POST(createMockRequest({}));

      expect(response.status).toBe(200);
      const json = await parseJsonResponse<BulkLoadCommitteesResponse>(
        response,
      );
      expect(json.success).toBe(true);
      expect(json.discrepanciesMap).toHaveLength(1);
      expect(prismaMock.committeeUploadDiscrepancy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ VRCNUM: "VRCNUM_NOT_IN_DB" }) as
            unknown,
        }),
      );
    });

    it("returns 500 when loadCommitteeLists throws", async () => {
      loadCommitteeListsMock.mockRejectedValue(new Error("File not found"));
      mockAuthSession({
        user: { id: "1", privilegeLevel: PrivilegeLevel.Admin },
      } as never);
      mockHasPermission(true);

      await expectErrorResponse(
        await POST(createMockRequest({})),
        500,
        "Error loading committee lists",
      );
    });
  });
});
