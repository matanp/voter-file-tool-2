/**
 * Tests for POST /api/admin/handleCommitteeDiscrepancy.
 * Tested: 401/403 auth, 400 when VRCNUM missing.
 * Not tested: 404 (discrepancy not found), accept/takeAddress flows, full success with committee update.
 */
import { POST } from "~/app/api/admin/handleCommitteeDiscrepancy/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockRequest,
  createAuthTestSuite,
  expectErrorResponse,
  expectSuccessResponse,
  type AuthTestConfig,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";

describe("/api/admin/handleCommitteeDiscrepancy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/admin/handleCommitteeDiscrepancy", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/admin/handleCommitteeDiscrepancy",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () =>
          createMockRequest({
            VRCNUM: "TEST123",
            committeeId: 1,
            accept: true,
            takeAddress: "",
          }),
      };

      const setupMocks = () => {
        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue({
          VRCNUM: "TEST123",
          committee: {
            cityTown: "Test City",
            legDistrict: 1,
            electionDistrict: 1,
          },
        } as never);
        prismaMock.committeeList.update.mockResolvedValue({} as never);
        prismaMock.voterRecord.update.mockResolvedValue({} as never);
        prismaMock.committeeUploadDiscrepancy.delete.mockResolvedValue(
          {} as never,
        );
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

    it("should return 400 when VRCNUM is missing", async () => {
      const mockSession = {
        user: { id: "1", privilegeLevel: PrivilegeLevel.Admin },
      };
      mockAuthSession(mockSession as never);
      mockHasPermission(true);

      const request = createMockRequest({
        committeeId: 1,
        accept: true,
        takeAddress: "",
      });

      const response = await POST(request);

      await expectErrorResponse(response, 400, "Invalid request");
    });
  });
});
