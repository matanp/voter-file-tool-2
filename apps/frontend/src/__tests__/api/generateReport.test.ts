/**
 * Tests for POST /api/generateReport.
 * Tested: 401/403 auth, ldCommittees success path, 400 for invalid body (fetch/Prisma mocked).
 * Not tested: other report types (designatedPetition, voterList, etc.), PDF API error handling, WEBHOOK_SECRET failure.
 */
import { POST } from "~/app/api/generateReport/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockRequest,
  createAuthTestSuite,
  expectSuccessResponse,
  type AuthTestConfig,
} from "../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../utils/mocks";

const MOCK_REPORT_ID = "cltestreportid123456789";

describe("/api/generateReport", () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, WEBHOOK_SECRET: "test-webhook-secret" };
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, numJobs: 0 }),
    });
  });

  afterAll(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  describe("POST /api/generateReport", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/generateReport",
        requiredPrivilege: PrivilegeLevel.RequestAccess,
        mockRequest: () =>
          createMockRequest({
            type: "ldCommittees",
            name: "Test Report",
            format: "pdf",
          }),
      };

      const setupMocks = () => {
        prismaMock.report.create.mockResolvedValue({
          id: MOCK_REPORT_ID,
        } as never);
        prismaMock.report.update.mockResolvedValue({} as never);
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

    it("should return reportId and jobsAhead on success", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          privilegeLevel: PrivilegeLevel.RequestAccess,
          name: "Test User",
          email: "test@example.com",
        },
      };
      mockAuthSession(mockSession as never);
      mockHasPermission(true);
      prismaMock.report.create.mockResolvedValue({
        id: MOCK_REPORT_ID,
      } as never);
      prismaMock.report.update.mockResolvedValue({} as never);

      const request = createMockRequest({
        type: "ldCommittees",
        name: "Test Report",
        format: "pdf",
      });

      const response = await POST(request);

      await expectSuccessResponse(response, {
        reportId: MOCK_REPORT_ID,
        jobsAhead: 0,
      });
      expect(prismaMock.report.create).toHaveBeenCalled();
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it("should return 400 for invalid request body", async () => {
      const mockSession = {
        user: { id: "1", privilegeLevel: PrivilegeLevel.RequestAccess },
      };
      mockAuthSession(mockSession as never);
      mockHasPermission(true);

      const request = createMockRequest({
        type: "invalidType",
        name: "Test",
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("Validation failed");
    });
  });
});
