/**
 * Tests for POST /api/admin/handleCommitteeDiscrepancy.
 */
import { POST } from "~/app/api/admin/handleCommitteeDiscrepancy/route";
import { Prisma, PrivilegeLevel } from "@prisma/client";
import {
  createMockRequest,
  createAuthTestSuite,
  expectErrorResponse,
  parseJsonResponse,
  createMockSession,
  createMockMembership,
  createMockVoterRecord,
  getMembershipMock,
  getAuditLogMock,
  expectAuditLogCreate,
  DEFAULT_ACTIVE_TERM_ID,
  type AuthTestConfig,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";

const createMockDiscrepancy = (overrides: Record<string, unknown> = {}) => ({
  id: "discrepancy-id-1",
  VRCNUM: "TEST123",
  committeeId: 1,
  discrepancy: { name: { incoming: "New Name", existing: "Old Name" } },
  resolvedAt: null,
  resolvedBy: null,
  resolution: null,
  resolutionMetadata: null,
  committee: {
    id: 1,
    cityTown: "Test City",
    legDistrict: 1,
    electionDistrict: 1,
    termId: DEFAULT_ACTIVE_TERM_ID,
    term: { id: DEFAULT_ACTIVE_TERM_ID, label: "2024–2026" },
  },
  ...overrides,
});

describe("/api/admin/handleCommitteeDiscrepancy", () => {
  const setupAuditSubjectMocks = () => {
    prismaMock.voterRecord.findUnique.mockResolvedValue(
      createMockVoterRecord({ VRCNUM: "TEST123" }),
    );
  };

  const setupResolveMocks = () => {
    prismaMock.$queryRaw.mockResolvedValue([] as never);
    getAuditLogMock(prismaMock).create.mockResolvedValue({});
    prismaMock.committeeUploadDiscrepancy.update.mockResolvedValue(
      {} as never,
    );
  };

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
            accept: true,
            takeAddress: "",
          }),
      };

      const setupMocks = () => {
        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
          createMockDiscrepancy() as never,
        );
        setupAuditSubjectMocks();
        setupResolveMocks();
        getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
        getMembershipMock(prismaMock).count.mockResolvedValue(0);
        getMembershipMock(prismaMock).create.mockResolvedValue(
          createMockMembership({
            id: "membership-new",
            status: "ACTIVE",
            activatedAt: new Date("2026-01-01T00:00:00.000Z"),
          }),
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

    it("returns 422 when VRCNUM is missing", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);

      const response = await POST(
        createMockRequest({ accept: true, takeAddress: "" }),
      );

      await expectErrorResponse(response, 422, "Invalid request data");
    });

    it("returns 404 when discrepancy is not found", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(null);

      const response = await POST(
        createMockRequest({ VRCNUM: "UNKNOWN_VRCNUM", accept: true, takeAddress: "" }),
      );

      await expectErrorResponse(response, 404, "Discrepancy not found");
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
      expect(prismaMock.committeeUploadDiscrepancy.update).not.toHaveBeenCalled();
    });

    it("accept resolution: activates voter membership and soft-resolves discrepancy", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      setupAuditSubjectMocks();
      setupResolveMocks();
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).create.mockResolvedValue(
        createMockMembership({
          id: "membership-new",
          status: "ACTIVE",
          seatNumber: 1,
          activatedAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
      );

      const response = await POST(
        createMockRequest({ VRCNUM: "TEST123", accept: true, takeAddress: "" }),
      );

      expect(response.status).toBe(200);
      const json = await parseJsonResponse<{ success: boolean; message: string }>(response);
      expect(json.success).toBe(true);
      expect(getMembershipMock(prismaMock).create).toHaveBeenCalled();
      expect(prismaMock.committeeUploadDiscrepancy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "discrepancy-id-1" },
          data: expect.objectContaining({
            resolution: "ACCEPTED",
            resolvedBy: "test-user-id",
          }) as unknown,
        }),
      );
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "DISCREPANCY_ACCEPTED",
          entityType: "CommitteeUploadDiscrepancy",
          entityId: "discrepancy-id-1",
        }),
      );
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_ACTIVATED",
          entityType: "CommitteeMembership",
          metadata: expect.objectContaining({
            source: "discrepancy_accept",
            discrepancyVrcnum: "TEST123",
          }) as Prisma.InputJsonValue,
        }),
      );
    });

    it("accept with existing non-ACTIVE membership: reactivates and logs audits", async () => {
      const existingMembershipId = "existing-membership-id";
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      setupAuditSubjectMocks();
      setupResolveMocks();
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({
          id: existingMembershipId,
          voterRecordId: "TEST123",
          committeeListId: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
          status: "REMOVED",
          membershipType: "APPOINTED",
          seatNumber: null,
          removedAt: new Date("2025-01-01"),
        }),
      );
      getMembershipMock(prismaMock).count.mockResolvedValue(1);
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({
          id: existingMembershipId,
          status: "ACTIVE",
          seatNumber: 2,
          activatedAt: new Date("2026-02-01T00:00:00.000Z"),
        }),
      );

      const response = await POST(
        createMockRequest({ VRCNUM: "TEST123", accept: true, takeAddress: "" }),
      );

      expect(response.status).toBe(200);
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalled();
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_ACTIVATED",
          entityId: existingMembershipId,
        }),
      );
    });

    it("reject resolution: soft-resolves with DISCREPANCY_REJECTED audit", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      setupResolveMocks();

      const response = await POST(
        createMockRequest({ VRCNUM: "TEST123", accept: false, takeAddress: "" }),
      );

      expect(response.status).toBe(200);
      expect(getMembershipMock(prismaMock).create).not.toHaveBeenCalled();
      expect(prismaMock.committeeUploadDiscrepancy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resolution: "REJECTED" }) as unknown,
        }),
      );
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "DISCREPANCY_REJECTED",
          entityType: "CommitteeUploadDiscrepancy",
        }),
      );
    });

    it("audit resolvedAt matches persisted resolvedAt", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      setupResolveMocks();

      const response = await POST(
        createMockRequest({ VRCNUM: "TEST123", accept: false, takeAddress: "" }),
      );

      expect(response.status).toBe(200);

      const updateCall = prismaMock.committeeUploadDiscrepancy.update.mock.calls[0];
      expect(updateCall).toBeDefined();
      const persistedResolvedAt = (
        updateCall![0] as { data: { resolvedAt: Date } }
      ).data.resolvedAt;

      const auditCalls = getAuditLogMock(prismaMock).create.mock.calls;
      const decisionAuditCall = auditCalls.find((call) => {
        const data = (call[0] as { data: { action: string } }).data;
        return data.action === "DISCREPANCY_REJECTED";
      });
      expect(decisionAuditCall).toBeDefined();

      const afterValue = (
        decisionAuditCall![0] as {
          data: { afterValue: { resolvedAt: string } };
        }
      ).data.afterValue;

      expect(afterValue.resolvedAt).toBe(persistedResolvedAt.toISOString());
    });

    it("returns 400 on P2002 active-per-term conflict during membership create", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      setupAuditSubjectMocks();
      setupResolveMocks();
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint", {
          code: "P2002",
          clientVersion: "5.0.0",
          meta: { target: ["voterRecordId", "termId"] },
        }),
      );

      const response = await POST(
        createMockRequest({ VRCNUM: "TEST123", accept: true, takeAddress: "" }),
      );

      await expectErrorResponse(response, 400, "Member is already in another committee");
      expect(prismaMock.committeeUploadDiscrepancy.update).not.toHaveBeenCalled();
    });

    it("returns 400 when accept would exceed committee capacity", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      setupAuditSubjectMocks();
      setupResolveMocks();
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMock(prismaMock).count.mockResolvedValue(4);
      prismaMock.seat.count.mockResolvedValue(0);

      const response = await POST(
        createMockRequest({ VRCNUM: "TEST123", accept: true, takeAddress: "" }),
      );

      await expectErrorResponse(response, 400, "Committee is at capacity");
      expect(prismaMock.seat.count).not.toHaveBeenCalled();
      expect(prismaMock.seat.createMany).not.toHaveBeenCalled();
      expect(prismaMock.committeeUploadDiscrepancy.update).not.toHaveBeenCalled();
      expect(getAuditLogMock(prismaMock).create).not.toHaveBeenCalled();
    });

    it("returns 400 when voter is ACTIVE in another committee for the term", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      setupAuditSubjectMocks();
      setupResolveMocks();
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue(
        createMockMembership({
          id: "active-other-committee",
          committeeListId: 999,
          termId: DEFAULT_ACTIVE_TERM_ID,
          status: "ACTIVE",
        }),
      );

      const response = await POST(
        createMockRequest({ VRCNUM: "TEST123", accept: true, takeAddress: "" }),
      );

      await expectErrorResponse(response, 400, "Member is already in another committee");
      expect(prismaMock.committeeUploadDiscrepancy.update).not.toHaveBeenCalled();
      expect(prismaMock.seat.count).not.toHaveBeenCalled();
      expect(prismaMock.seat.createMany).not.toHaveBeenCalled();
    });

    it("returns 400 when reject includes takeAddress", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      setupResolveMocks();

      const response = await POST(
        createMockRequest({
          VRCNUM: "TEST123",
          accept: false,
          takeAddress: "456 New St",
        }),
      );

      await expectErrorResponse(
        response,
        400,
        "Cannot update address when rejecting a discrepancy",
      );
      expect(prismaMock.voterRecord.update).not.toHaveBeenCalled();
    });

    it("takeAddress: updates voterRecord.addressForCommittee and sets ACCEPTED_WITH_ADDRESS", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      setupAuditSubjectMocks();
      setupResolveMocks();
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).create.mockResolvedValue(
        createMockMembership({
          id: "membership-new",
          status: "ACTIVE",
          activatedAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
      );
      prismaMock.voterRecord.update.mockResolvedValue({} as never);

      const response = await POST(
        createMockRequest({
          VRCNUM: "TEST123",
          accept: true,
          takeAddress: "456 New St",
        }),
      );

      expect(response.status).toBe(200);
      expect(prismaMock.voterRecord.update).toHaveBeenCalledWith({
        where: { VRCNUM: "TEST123" },
        data: { addressForCommittee: "456 New St" },
      });
      expect(prismaMock.committeeUploadDiscrepancy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resolution: "ACCEPTED_WITH_ADDRESS",
          }) as unknown,
        }),
      );
    });

    it("takeAddress preserves exact stored value without trimming", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      setupAuditSubjectMocks();
      setupResolveMocks();
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
      getMembershipMock(prismaMock).count.mockResolvedValue(0);
      getMembershipMock(prismaMock).create.mockResolvedValue(
        createMockMembership({
          id: "membership-new",
          status: "ACTIVE",
          activatedAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
      );
      prismaMock.voterRecord.update.mockResolvedValue({} as never);

      const exactAddress = "  456 New St  ";
      const response = await POST(
        createMockRequest({
          VRCNUM: "TEST123",
          accept: true,
          takeAddress: exactAddress,
        }),
      );

      expect(response.status).toBe(200);
      expect(prismaMock.voterRecord.update).toHaveBeenCalledWith({
        where: { VRCNUM: "TEST123" },
        data: { addressForCommittee: exactAddress },
      });
      expect(prismaMock.committeeUploadDiscrepancy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resolutionMetadata: expect.objectContaining({
              addressAfter: exactAddress,
            }) as unknown,
          }) as unknown,
        }),
      );
    });

    it("already-resolved discrepancy: second call returns 409 already_resolved", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique
        .mockResolvedValueOnce(createMockDiscrepancy() as never)
        .mockResolvedValueOnce(createMockDiscrepancy() as never)
        .mockResolvedValueOnce(createMockDiscrepancy() as never)
        .mockResolvedValueOnce(
          createMockDiscrepancy({
            resolvedAt: new Date("2026-01-01"),
            resolution: "REJECTED",
          }) as never,
        );
      setupResolveMocks();

      const response1 = await POST(
        createMockRequest({ VRCNUM: "TEST123", accept: false, takeAddress: "" }),
      );
      expect(response1.status).toBe(200);

      const response2 = await POST(
        createMockRequest({ VRCNUM: "TEST123", accept: false, takeAddress: "" }),
      );

      expect(response2.status).toBe(409);
      const json = await parseJsonResponse<{ reason?: string }>(response2);
      expect(json.reason).toBe("already_resolved");
    });

    it("rolls back resolve when audit write fails", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createMockDiscrepancy() as never,
      );
      setupResolveMocks();
      getAuditLogMock(prismaMock).create.mockRejectedValue(
        new Error("Audit insert failed"),
      );

      const response = await POST(
        createMockRequest({ VRCNUM: "TEST123", accept: false, takeAddress: "" }),
      );

      await expectErrorResponse(response, 500, "Internal server error");
      expect(prismaMock.committeeUploadDiscrepancy.update).not.toHaveBeenCalled();
    });
  });
});
