/**
 * Tests for GET /api/reports.
 * Tested: 401/403 auth, basic success with empty results.
 * Not tested: S3 presigned URL logic, type filtering (all/my-reports/public), pagination edge cases, error handling.
 */
import { GET } from "~/app/api/reports/route";
import { NextRequest } from "next/server";
import {
  createMockSession,
  createAuthTestSuite,
  expectSuccessResponse,
  type AuthTestConfig,
} from "../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../utils/mocks";

describe("/api/reports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/reports", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/reports",
        requiredPrivilege: "Authenticated",
        mockRequest: () => new NextRequest("http://localhost:3000/api/reports"),
      };

      const setupMocks = () => {
        prismaMock.report.findMany.mockResolvedValue([]);
        prismaMock.report.count.mockResolvedValue(0);
      };

      const authTestSuite = createAuthTestSuite(
        authConfig,
        GET,
        mockAuthSession,
        mockHasPermission,
        setupMocks,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

    it("should return reports for authenticated user", async () => {
      const mockSession = createMockSession();
      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.report.findMany.mockResolvedValue([]);
      prismaMock.report.count.mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/reports");

      const response = await GET(request);

      await expectSuccessResponse(response, {
        reports: [],
        totalCount: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });
      expect(prismaMock.report.findMany).toHaveBeenCalled();
    });
  });
});
