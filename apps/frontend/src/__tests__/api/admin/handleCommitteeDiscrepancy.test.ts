/**
 * Tests for POST /api/admin/handleCommitteeDiscrepancy.
 * T1.3 acceptance: auth, 400 when VRCNUM missing, 404 when discrepancy not found,
 * accept flow (adds voter to committee), reject flow (does not add), takeAddress,
 * already-resolved idempotency (404), voter not found at accept (500).
 */
import { POST } from "~/app/api/admin/handleCommitteeDiscrepancy/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockRequest,
  createAuthTestSuite,
  expectErrorResponse,
  parseJsonResponse,
  createMockSession,
  DEFAULT_ACTIVE_TERM_ID,
  type AuthTestConfig,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";

const createMockDiscrepancy = (overrides: Record<string, unknown> = {}) => ({
  VRCNUM: "TEST123",
  committee: {
    id: 1,
    cityTown: "Test City",
    legDistrict: 1,
    electionDistrict: 1,
    termId: DEFAULT_ACTIVE_TERM_ID,
  },
  ...overrides,
});

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
        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
          createMockDiscrepancy() as never,
        );
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

    it("returns 400 when VRCNUM is missing", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);

      const request = createMockRequest({
        committeeId: 1,
        accept: true,
        takeAddress: "",
      });

      const response = await POST(request);

      await expectErrorResponse(response, 400, "Invalid request");
    });

    it("returns 404 when discrepancy is not found", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(null);

      const request = createMockRequest({
        VRCNUM: "UNKNOWN_VRCNUM",
        accept: true,
        takeAddress: "",
      });

      const response = await POST(request);

      await expectErrorResponse(response, 404, "Discrepancy not found");
      expect(prismaMock.committeeList.update).not.toHaveBeenCalled();
      expect(prismaMock.committeeUploadDiscrepancy.delete).not.toHaveBeenCalled();
    });

    it("accept resolution: adds voter to committee and deletes discrepancy", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      prismaMock.committeeList.update.mockResolvedValue({} as never);
      prismaMock.committeeUploadDiscrepancy.delete.mockResolvedValue(
        {} as never,
      );

      const request = createMockRequest({
        VRCNUM: "TEST123",
        accept: true,
        takeAddress: "",
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await parseJsonResponse<{ success: boolean; message: string }>(response);
      expect(json.success).toBe(true);
      expect(json.message).toBe("Discrepancy handled successfully");
      expect(prismaMock.committeeList.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            cityTown_legDistrict_electionDistrict_termId: {
              cityTown: "Test City",
              legDistrict: 1,
              electionDistrict: 1,
              termId: DEFAULT_ACTIVE_TERM_ID,
            },
          },
          data: {
            committeeMemberList: { connect: { VRCNUM: "TEST123" } },
          },
        }),
      );
      expect(prismaMock.committeeUploadDiscrepancy.delete).toHaveBeenCalledWith({
        where: { VRCNUM: "TEST123" },
      });
    });

    it("reject resolution: does not add voter, still deletes discrepancy", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      prismaMock.committeeUploadDiscrepancy.delete.mockResolvedValue(
        {} as never,
      );

      const request = createMockRequest({
        VRCNUM: "TEST123",
        accept: false,
        takeAddress: "",
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await parseJsonResponse<{ success: boolean; message: string }>(response);
      expect(json.success).toBe(true);
      expect(prismaMock.committeeList.update).not.toHaveBeenCalled();
      expect(prismaMock.committeeUploadDiscrepancy.delete).toHaveBeenCalledWith({
        where: { VRCNUM: "TEST123" },
      });
    });

    it("takeAddress: updates voterRecord.addressForCommittee when provided", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      prismaMock.committeeList.update.mockResolvedValue({} as never);
      prismaMock.voterRecord.update.mockResolvedValue({} as never);
      prismaMock.committeeUploadDiscrepancy.delete.mockResolvedValue(
        {} as never,
      );

      const request = createMockRequest({
        VRCNUM: "TEST123",
        accept: true,
        takeAddress: "456 New St",
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prismaMock.voterRecord.update).toHaveBeenCalledWith({
        where: { VRCNUM: "TEST123" },
        data: { addressForCommittee: "456 New St" },
      });
    });

    it("already-resolved discrepancy: second call returns 404 (idempotent)", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique
        .mockResolvedValueOnce(createMockDiscrepancy() as never)
        .mockResolvedValueOnce(null);
      prismaMock.committeeUploadDiscrepancy.delete.mockResolvedValue({} as never);

      const request1 = createMockRequest({ VRCNUM: "TEST123", accept: false, takeAddress: "" });
      const response1 = await POST(request1);

      expect(response1.status).toBe(200);

      const request2 = createMockRequest({ VRCNUM: "TEST123", accept: false, takeAddress: "" });
      const response2 = await POST(request2);

      await expectErrorResponse(response2, 404, "Discrepancy not found");
    });

    it("returns 500 when committeeList.update fails (e.g. voter not in DB at accept)", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      prismaMock.committeeList.update.mockRejectedValue(
        new Error("Foreign key constraint failed"),
      );

      const request = createMockRequest({
        VRCNUM: "TEST123",
        accept: true,
        takeAddress: "",
      });

      const response = await POST(request);

      await expectErrorResponse(response, 500, "Internal server error");
    });
  });
});
