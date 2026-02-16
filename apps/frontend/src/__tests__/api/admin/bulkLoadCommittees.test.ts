/**
 * Tests for POST /api/admin/bulkLoadCommittees.
 * Tested: 401/403 auth, success with empty loadCommitteeLists (mocked).
 * Not tested: actual loadCommitteeLists/file loading, success with real discrepancies.
 */
import { POST } from "~/app/api/admin/bulkLoadCommittees/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockRequest,
  createAuthTestSuite,
  parseJsonResponse,
  type AuthTestConfig,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";

type BulkLoadCommitteesResponse = {
  success: boolean;
  message: string;
  discrepanciesMap: unknown[];
  recordsWithDiscrepancies: unknown[];
};

jest.mock("~/app/api/admin/bulkLoadCommittees/bulkLoadUtils", () => ({
  loadCommitteeLists: jest.fn().mockResolvedValue(new Map()),
}));

describe("/api/admin/bulkLoadCommittees", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
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

    it("should return success when authenticated as Admin", async () => {
      const mockSession = {
        user: { id: "1", privilegeLevel: PrivilegeLevel.Admin },
      };
      mockAuthSession(mockSession as never);
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.deleteMany.mockResolvedValue(
        {} as never,
      );
      prismaMock.voterRecord.findMany.mockResolvedValue([]);

      const request = createMockRequest({});
      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await parseJsonResponse<BulkLoadCommitteesResponse>(
        response,
      );
      expect(json.success).toBe(true);
      expect(json.message).toBe("Committee lists loaded successfully");
      expect(json.discrepanciesMap).toEqual([]);
      expect(Array.isArray(json.recordsWithDiscrepancies)).toBe(true);
    });
  });
});
