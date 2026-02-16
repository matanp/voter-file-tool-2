/**
 * Tests for POST /api/admin/loadAdmin.
 * Tested: 401/403 auth, success when Developer (Prisma mocked).
 * Not tested: actual privilege escalation / user update logic.
 */
import { POST } from "~/app/api/admin/loadAdmin/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockRequest,
  createAuthTestSuite,
  expectSuccessResponse,
  type AuthTestConfig,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";

describe("/api/admin/loadAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/admin/loadAdmin", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/admin/loadAdmin",
        requiredPrivilege: PrivilegeLevel.Developer,
        mockRequest: () => createMockRequest({}),
      };

      const setupMocks = () => {
        prismaMock.user.findUnique.mockResolvedValue(null);
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

    it("should return success when authenticated as Developer", async () => {
      const mockSession = {
        user: { id: "1", privilegeLevel: PrivilegeLevel.Developer },
      };
      mockAuthSession(mockSession as never);
      mockHasPermission(true);
      prismaMock.user.findUnique.mockResolvedValue(null);

      const request = createMockRequest({});
      const response = await POST(request);

      await expectSuccessResponse(response, { success: true });
    });
  });
});
