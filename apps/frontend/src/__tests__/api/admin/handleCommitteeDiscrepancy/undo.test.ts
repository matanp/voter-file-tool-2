/**
 * Tests for POST /api/admin/handleCommitteeDiscrepancy/undo.
 */
import { POST } from "~/app/api/admin/handleCommitteeDiscrepancy/undo/route";
import {
  Prisma,
  PrivilegeLevel,
  type CommitteeList,
  type CommitteeTerm,
  type CommitteeUploadDiscrepancy,
} from "@prisma/client";
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
  expectMembershipExitWrite,
  jsonContaining,
  selectedRow,
  DEFAULT_ACTIVE_TERM_ID,
  type AuthTestConfig,
} from "../../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../../utils/mocks";

const activatedAt = "2026-01-01T00:00:00.000Z";

/** The discrepancy row as `lockDiscrepancyForUpdate` selects it. */
type ResolvedDiscrepancyRow = Pick<
  CommitteeUploadDiscrepancy,
  | "id"
  | "VRCNUM"
  | "committeeId"
  | "discrepancy"
  | "resolvedAt"
  | "resolvedBy"
  | "resolution"
  | "resolutionMetadata"
> & {
  committee: Pick<
    CommitteeList,
    "id" | "cityTown" | "legDistrict" | "electionDistrict" | "termId"
  > & { term: Pick<CommitteeTerm, "id" | "label"> };
};

const createResolvedDiscrepancy = (
  overrides: Partial<ResolvedDiscrepancyRow> = {},
): ResolvedDiscrepancyRow => ({
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
    prismaMock.voterRecord.findUnique.mockResolvedValue(createMockVoterRecord({ VRCNUM: "TEST123" }));
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
        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(selectedRow(createResolvedDiscrepancy()));
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

      const authTestSuite = createAuthTestSuite(authConfig, POST, mockAuthSession, mockHasPermission, setupMocks);

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

    describe("with a pending Exit Report on the member", () => {
      const REPORTED_AT = new Date("2026-10-30T15:04:05.678Z");
      const reportedMember = () =>
        createMockMembership({
          id: "membership-new",
          status: "ACTIVE",
          seatNumber: 1,
          activatedAt: new Date(activatedAt),
          exitReportedAt: REPORTED_AT,
          exitReportedById: "leader-1",
          exitReportedKind: "RESIGNATION",
          removalReason: "OTHER",
          removalNotes: "Reported by a Leader",
        });
      const superseded = {
        reportedById: "leader-1",
        reportedAt: REPORTED_AT.toISOString(),
        kind: "RESIGNATION",
      };

      beforeEach(() => {
        mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
        mockHasPermission(true);
        setupUndoMocks();
        prismaMock.committeeMembership.findUnique.mockResolvedValue(selectedRow(reportedMember()));
      });

      it("undoing a created membership removes it, clearing the report and its reported details", async () => {
        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(selectedRow(createResolvedDiscrepancy()));
        prismaMock.committeeMembership.update.mockResolvedValue(
          selectedRow(
            createMockMembership({
              id: "membership-new",
              status: "REMOVED",
              seatNumber: null,
            }),
          ),
        );

        const response = await POST(createMockRequest({ VRCNUM: "TEST123" }));

        expect(response.status).toBe(200);
        expect(prismaMock.committeeMembership.update).toHaveBeenCalledWith(
          expectMembershipExitWrite("membership-new", {
            status: "REMOVED",
            removalReason: "OTHER",
            removalNotes: "Undo of discrepancy accept",
            exitReportedAt: null,
            exitReportedById: null,
            exitReportedKind: null,
          }),
        );
        expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
          expectAuditLogCreate({
            action: "MEMBER_REMOVED",
            metadata: jsonContaining({
              source: "discrepancy_undo",
              supersededExitReport: superseded,
            }),
          }),
        );
      });

      it("undoing a reactivation writes back the saved RESIGNED state with the report fields null", async () => {
        prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(
          selectedRow(
            createResolvedDiscrepancy({
              resolutionMetadata: {
                membershipOutcome: "reactivated",
                membershipId: "membership-new",
                membershipAfter: {
                  status: "ACTIVE",
                  seatNumber: 1,
                  activatedAt,
                },
                membershipBefore: {
                  status: "RESIGNED",
                  membershipType: "APPOINTED",
                  seatNumber: null,
                  activatedAt: "2025-01-01T00:00:00.000Z",
                  confirmedAt: null,
                  resignedAt: "2025-06-01T00:00:00.000Z",
                  removedAt: null,
                  rejectedAt: null,
                  rejectionNote: null,
                  resignationDateReceived: "2025-05-30T00:00:00.000Z",
                  resignationMethod: "MAIL",
                  removalReason: "MOVED_OUT_OF_DISTRICT",
                  removalNotes: null,
                  petitionVoteCount: null,
                  petitionPrimaryDate: null,
                },
              },
            }),
          ),
        );
        prismaMock.committeeMembership.update.mockResolvedValue(
          selectedRow(
            createMockMembership({
              id: "membership-new",
              status: "RESIGNED",
              seatNumber: null,
            }),
          ),
        );

        const response = await POST(createMockRequest({ VRCNUM: "TEST123" }));

        expect(response.status).toBe(200);
        expect(prismaMock.committeeMembership.update).toHaveBeenCalledWith(
          expectMembershipExitWrite("membership-new", {
            status: "RESIGNED",
            resignedAt: new Date("2025-06-01T00:00:00.000Z"),
            resignationMethod: "MAIL",
            removalReason: "MOVED_OUT_OF_DISTRICT",
            removalNotes: null,
            exitReportedAt: null,
            exitReportedKind: null,
          }),
        );
        expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
          expectAuditLogCreate({
            action: "MEMBER_RESIGNED",
            metadata: jsonContaining({
              source: "discrepancy_undo",
              supersededExitReport: superseded,
            }),
          }),
        );
      });
    });

    it("created-membership accept undo: transitions to REMOVED and reopens row", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(selectedRow(createResolvedDiscrepancy()));
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
        expectMembershipExitWrite("membership-new", {
          status: "REMOVED",
          seatNumber: null,
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
        selectedRow(
          createResolvedDiscrepancy({
            resolution: "REJECTED",
            resolutionMetadata: { membershipOutcome: "none" },
          }),
        ),
      );
      setupUndoMocks();

      const response = await POST(createMockRequest({ VRCNUM: "TEST123" }));

      expect(response.status).toBe(200);
      expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    });

    it("returns 409 membership_diverged when membership changed since resolve", async () => {
      mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
      mockHasPermission(true);
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(selectedRow(createResolvedDiscrepancy()));
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
      prismaMock.committeeUploadDiscrepancy.findUnique.mockResolvedValue(selectedRow(createResolvedDiscrepancy()));
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
        selectedRow(
          createResolvedDiscrepancy({
            resolvedAt: null,
            resolution: null,
            resolutionMetadata: null,
          }),
        ),
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
        selectedRow(
          createResolvedDiscrepancy({
            resolution: "ACCEPTED_WITH_ADDRESS",
            resolutionMetadata: {
              membershipOutcome: "none",
              addressBefore: "123 Old St",
              addressAfter: "456 New Ave",
            },
          }),
        ),
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
        selectedRow(
          createResolvedDiscrepancy({
            resolution: "ACCEPTED_WITH_ADDRESS",
            resolutionMetadata: {
              membershipOutcome: "none",
              addressBefore: null,
              addressAfter: "456 New Ave",
            },
          }),
        ),
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
        selectedRow(
          createResolvedDiscrepancy({
            resolution: "ACCEPTED_WITH_ADDRESS",
            resolutionMetadata: {
              membershipOutcome: "none",
              addressBefore: "123 Old St",
              addressAfter: "456 New Ave",
            },
          }),
        ),
      );
      setupUndoMocks();
      prismaMock.voterRecord.findUnique.mockResolvedValue({
        addressForCommittee: "999 Manual Edit",
      } as never);

      const response = await POST(createMockRequest({ VRCNUM: "TEST123" }));

      expect(response.status).toBe(200);
      const json = await parseJsonResponse<{ addressRestoreSkipped?: boolean }>(response);
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
