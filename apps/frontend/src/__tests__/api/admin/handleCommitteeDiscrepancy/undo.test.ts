/**
 * Tests for POST /api/admin/handleCommitteeDiscrepancy/undo.
 */
import { POST } from "~/app/api/admin/handleCommitteeDiscrepancy/undo/route";
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
} from "../../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../../utils/mocks";

const activatedAt = "2026-01-01T00:00:00.000Z";

const createResolvedDiscrepancy = (overrides: Record<string, unknown> = {}) => ({
  id: "discrepancy-id-1",
  VRCNUM: "TEST123",
  committeeId: 1,
  discrepancy: { name: { incoming: "New", existing: "Old" } },
  resolvedAt: new Date("2026-01-02T00:00:00.000Z"),
  resolvedBy: "admin-user",
  resolution: "ACCEPTED",
  resolutionMetadata: {
    membershipOutcome: "created",
    membershipId: "membership-new",
    membershipAfter: {
      status: "ACTIVE",
      seatNumber: 1,
      activatedAt,
    },
  },
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

describe("/api/admin/handleCommitteeDiscrepancy/undo", () => {
  const setupUndoMocks = () => {
    prismaMock.$queryRaw.mockResolvedValue([] as never);
    getAuditLogMock(prismaMock).create.mockResolvedValue({});
    prismaMock.committeeUploadDiscrepancy.update.mockResolvedValue({} as never);
    prismaMock.voterRecord.findUnique.mockResolvedValue(
      createMockVoterRecord({ VRCNUM: "TEST123" }),
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/admin/handleCommitteeDiscrepancy/undo", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/admin/handleCommitteeDiscrepancy/undo",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () => createMockRequest({ VRCNUM: "TEST123" }),
      };

      const setupMocks = () => {
        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
          createResolvedDiscrepancy() as never,
        );
        setupUndoMocks();
        getMembershipMock(prismaMock).findUnique.mockResolvedValue(
          createMockMembership({
            id: "membership-new",
            status: "ACTIVE",
            seatNumber: 1,
            activatedAt: new Date(activatedAt),
          }),
        );
        getMembershipMock(prismaMock).update.mockResolvedValue(
          createMockMembership({
            id: "membership-new",
            status: "REMOVED",
            seatNumber: null,
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

    it("created-membership accept undo: transitions to REMOVED and reopens row", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createResolvedDiscrepancy() as never,
      );
      setupUndoMocks();
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({
          id: "membership-new",
          status: "ACTIVE",
          seatNumber: 1,
          activatedAt: new Date(activatedAt),
        }),
      );
      getMembershipMock(prismaMock).update.mockResolvedValue(
        createMockMembership({
          id: "membership-new",
          status: "REMOVED",
          seatNumber: null,
        }),
      );

      const response = await POST(createMockRequest({ VRCNUM: "TEST123" }));

      expect(response.status).toBe(200);
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "membership-new" },
          data: expect.objectContaining({
            status: "REMOVED",
            seatNumber: null,
          }) as unknown,
        }),
      );
      expect(prismaMock.committeeUploadDiscrepancy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            resolvedAt: null,
            resolvedBy: null,
            resolution: null,
            resolutionMetadata: Prisma.JsonNull,
          },
        }),
      );
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "DISCREPANCY_UNDONE",
          entityType: "CommitteeUploadDiscrepancy",
        }),
      );
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_REMOVED",
          metadata: expect.objectContaining({
            source: "discrepancy_undo",
          }) as Prisma.InputJsonValue,
        }),
      );
    });

    it("reject undo: reopens row without membership changes", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createResolvedDiscrepancy({
          resolution: "REJECTED",
          resolutionMetadata: { membershipOutcome: "none" },
        }) as never,
      );
      setupUndoMocks();

      const response = await POST(createMockRequest({ VRCNUM: "TEST123" }));

      expect(response.status).toBe(200);
      expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    });

    it("returns 409 membership_diverged when membership changed since resolve", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createResolvedDiscrepancy() as never,
      );
      setupUndoMocks();
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({
          id: "membership-new",
          status: "ACTIVE",
          seatNumber: 2,
          activatedAt: new Date(activatedAt),
        }),
      );

      const response = await POST(createMockRequest({ VRCNUM: "TEST123" }));

      expect(response.status).toBe(409);
      const json = await parseJsonResponse<{ reason?: string }>(response);
      expect(json.reason).toBe("membership_diverged");
      expect(prismaMock.committeeUploadDiscrepancy.update).not.toHaveBeenCalled();
    });

    it("returns 409 membership_diverged when membership row is missing", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createResolvedDiscrepancy() as never,
      );
      setupUndoMocks();
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);

      const response = await POST(createMockRequest({ VRCNUM: "TEST123" }));

      expect(response.status).toBe(409);
      const json = await parseJsonResponse<{ reason?: string }>(response);
      expect(json.reason).toBe("membership_diverged");
    });

    it("returns 409 not_resolved when discrepancy is unresolved", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createResolvedDiscrepancy({
          resolvedAt: null,
          resolution: null,
          resolutionMetadata: null,
        }) as never,
      );
      setupUndoMocks();

      const response = await POST(createMockRequest({ VRCNUM: "TEST123" }));

      expect(response.status).toBe(409);
      const json = await parseJsonResponse<{ reason?: string }>(response);
      expect(json.reason).toBe("not_resolved");
    });

    it("accept-with-address undo restores address when unchanged since resolve", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createResolvedDiscrepancy({
          resolution: "ACCEPTED_WITH_ADDRESS",
          resolutionMetadata: {
            membershipOutcome: "none",
            addressBefore: "123 Old St",
            addressAfter: "456 New Ave",
          },
        }) as never,
      );
      setupUndoMocks();
      prismaMock.voterRecord.findUnique.mockResolvedValue({
        addressForCommittee: "456 New Ave",
      } as never);
      prismaMock.voterRecord.update.mockResolvedValue({} as never);

      const response = await POST(createMockRequest({ VRCNUM: "TEST123" }));

      expect(response.status).toBe(200);
      expect(prismaMock.voterRecord.update).toHaveBeenCalledWith({
        where: { VRCNUM: "TEST123" },
        data: { addressForCommittee: "123 Old St" },
      });
    });

    it("accept-with-address undo restores a previously-null committee address", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createResolvedDiscrepancy({
          resolution: "ACCEPTED_WITH_ADDRESS",
          resolutionMetadata: {
            membershipOutcome: "none",
            addressBefore: null,
            addressAfter: "456 New Ave",
          },
        }) as never,
      );
      setupUndoMocks();
      prismaMock.voterRecord.findUnique.mockResolvedValue({
        addressForCommittee: "456 New Ave",
      } as never);
      prismaMock.voterRecord.update.mockResolvedValue({} as never);

      const response = await POST(createMockRequest({ VRCNUM: "TEST123" }));

      expect(response.status).toBe(200);
      expect(prismaMock.voterRecord.update).toHaveBeenCalledWith({
        where: { VRCNUM: "TEST123" },
        data: { addressForCommittee: null },
      });
    });

    it("accept-with-address undo skips address restore when manually edited", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
        createResolvedDiscrepancy({
          resolution: "ACCEPTED_WITH_ADDRESS",
          resolutionMetadata: {
            membershipOutcome: "none",
            addressBefore: "123 Old St",
            addressAfter: "456 New Ave",
          },
        }) as never,
      );
      setupUndoMocks();
      prismaMock.voterRecord.findUnique.mockResolvedValue({
        addressForCommittee: "999 Manual Edit",
      } as never);

      const response = await POST(createMockRequest({ VRCNUM: "TEST123" }));

      expect(response.status).toBe(200);
      const json = await parseJsonResponse<{ addressRestoreSkipped?: boolean }>(
        response,
      );
      expect(json.addressRestoreSkipped).toBe(true);
      expect(prismaMock.voterRecord.update).not.toHaveBeenCalled();
    });

    it("returns 422 when VRCNUM is missing", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);

      const response = await POST(createMockRequest({}));

      await expectErrorResponse(response, 422, "Invalid request data");
    });
  });
});
