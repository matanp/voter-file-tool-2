/**
 * Tests for GET /api/reportJobs.
 * Tested: 401/403 auth, basic success with empty results.
 * Not tested: status filtering, pagination edge cases, 400 validation for invalid status.
 */
import { GET } from "~/app/api/reportJobs/route";
import { NextRequest } from "next/server";
import {
  createMockSession,
  createAuthTestSuite,
  expectSuccessResponse,
  type AuthTestConfig,
} from "../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../utils/mocks";

describe("/api/reportJobs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/reportJobs", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/reportJobs",
        requiredPrivilege: "Authenticated",
        mockRequest: () =>
          new NextRequest("http://localhost:3000/api/reportJobs"),
      };

      const setupMocks = () => {
        prismaMock.report.count.mockResolvedValue(0);
        prismaMock.report.findMany.mockResolvedValue([]);
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

    it("should return report jobs for authenticated user", async () => {
      const mockSession = createMockSession();
      mockAuthSession(mockSession);
      mockHasPermission(true);
      prismaMock.report.count.mockResolvedValue(0);
      prismaMock.report.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/reportJobs",
      );

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
