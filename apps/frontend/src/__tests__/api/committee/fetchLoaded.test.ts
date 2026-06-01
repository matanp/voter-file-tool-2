/**
 * Tests for POST /api/committee/fetchLoaded.
 * Tested: 401/403 auth (Admin only), success with empty/non-empty discrepancies, 500 on error.
 */
import { POST } from "~/app/api/committee/fetchLoaded/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockRequest,
  createAuthTestSuite,
  expectSuccessResponse,
  expectErrorResponse,
  parseJsonResponse,
  type AuthTestConfig,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";

type FetchLoadedResponse = {
  success: boolean;
  discrepanciesMap: Array<
    [string, { discrepancies: Record<string, string>; committee: unknown }]
  >;
  recordsWithDiscrepancies: unknown[];
};

describe("/api/committee/fetchLoaded", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/committee/fetchLoaded", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/committee/fetchLoaded",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () => createMockRequest({}),
      };

      const setupMocks = () => {
        prismaMock.committeeUploadDiscrepancy.findMany.mockResolvedValue([]);
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

    it("should return success with empty discrepancies", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findMany.mockResolvedValue([]);

      const request = createMockRequest({});
      const response = await POST(request);

      await expectSuccessResponse(response, {
        success: true,
        message: "Discrepancies fetched and processed successfully",
        discrepanciesMap: [],
        recordsWithDiscrepancies: [],
      });
    });

    it("should return success with discrepancies when present", async () => {
      const mockCommittee = {
        id: 1,
        cityTown: "Test City",
        legDistrict: 1,
        electionDistrict: 1,
      };
      const mockDiscrepancies = [
        {
          VRCNUM: "VRC001",
          discrepancy: { incoming: "in", existing: "ex" },
          committee: mockCommittee,
        },
      ];
      const mockVoterRecords = [
        { VRCNUM: "VRC001", firstName: "John", lastName: "Doe" },
      ];

      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findMany.mockResolvedValue(
        mockDiscrepancies as never,
      );
      prismaMock.voterRecord.findMany.mockResolvedValue(
        mockVoterRecords as never,
      );

      const request = createMockRequest({});
      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await parseJsonResponse<FetchLoadedResponse>(response);
      expect(json.success).toBe(true);
      expect(json.discrepanciesMap).toHaveLength(1);
      expect(json.discrepanciesMap[0]).toEqual([
        "VRC001",
        {
          discrepancies: { incoming: "in", existing: "ex" },
          committee: mockCommittee,
        },
      ]);
      expect(json.recordsWithDiscrepancies).toEqual(mockVoterRecords);
    });

    it("should use last discrepancy when multiple exist for same VRCNUM", async () => {
      const mockCommittee = {
        id: 1,
        cityTown: "Test City",
        legDistrict: 1,
        electionDistrict: 1,
      };
      const mockDiscrepancies = [
        {
          VRCNUM: "VRC001",
          discrepancy: { incoming: "first", existing: "ex1" },
          committee: mockCommittee,
        },
        {
          VRCNUM: "VRC001",
          discrepancy: { incoming: "second", existing: "ex2" },
          committee: mockCommittee,
        },
      ];
      const mockVoterRecords = [
        { VRCNUM: "VRC001", firstName: "John", lastName: "Doe" },
      ];

      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findMany.mockResolvedValue(
        mockDiscrepancies as never,
      );
      prismaMock.voterRecord.findMany.mockResolvedValue(
        mockVoterRecords as never,
      );

      const request = createMockRequest({});
      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await parseJsonResponse<FetchLoadedResponse>(response);
      // reduce overwrites: last entry wins
      expect(json.discrepanciesMap).toHaveLength(1);
      expect(json.discrepanciesMap[0]![1].discrepancies).toEqual({
        incoming: "second",
        existing: "ex2",
      });
    });

    it("should return discrepancy in map even when voter record not found", async () => {
      const mockCommittee = {
        id: 1,
        cityTown: "Test City",
        legDistrict: 1,
        electionDistrict: 1,
      };
      const mockDiscrepancies = [
        {
          VRCNUM: "VRC_MISSING",
          discrepancy: { incoming: "in", existing: "ex" },
          committee: mockCommittee,
        },
      ];

      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findMany.mockResolvedValue(
        mockDiscrepancies as never,
      );
      prismaMock.voterRecord.findMany.mockResolvedValue([] as never);

      const request = createMockRequest({});
      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await parseJsonResponse<FetchLoadedResponse>(response);
      expect(json.discrepanciesMap).toHaveLength(1);
      expect(json.discrepanciesMap[0]![0]).toBe("VRC_MISSING");
      expect(json.recordsWithDiscrepancies).toEqual([]);
    });

    it("should return 500 on Prisma error", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findMany.mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest({});
      const response = await POST(request);

      await expectErrorResponse(response, 500, "Error processing discrepancies");
    });
  });
});
