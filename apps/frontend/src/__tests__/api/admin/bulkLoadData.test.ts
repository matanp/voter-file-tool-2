/**
 * Tests for POST /api/admin/bulkLoadData.
 * Tested: 401/403 auth, 503 when VERCEL env set.
 * Not tested: actual parseCSV/file loading (mocked), success path with real data.
 */
import { POST } from "~/app/api/admin/bulkLoadData/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockRequest,
  createAuthTestSuite,
  type AuthTestConfig,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission } from "../../utils/mocks";

jest.mock("~/app/api/admin/bulkLoadData/bulkLoadUtils", () => ({
  parseCSV: jest.fn().mockResolvedValue(undefined),
}));

describe("/api/admin/bulkLoadData", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.VERCEL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("POST /api/admin/bulkLoadData", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/admin/bulkLoadData",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () => createMockRequest({}),
      };

      const authTestSuite = createAuthTestSuite(
        authConfig,
        POST,
        mockAuthSession,
        mockHasPermission,
        undefined,
        200,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

    it("should return 503 when VERCEL env is set", async () => {
      process.env.VERCEL = "1";
      const mockSession = { user: { id: "1", privilegeLevel: PrivilegeLevel.Admin } };
      mockAuthSession(mockSession as never);
      mockHasPermission(true);

      const request = createMockRequest({});
      const response = await POST(request);

      expect(response.status).toBe(503);
      const json = await response.json();
      expect(json.error).toBe("Not available in this environment");
    });
  });
});
