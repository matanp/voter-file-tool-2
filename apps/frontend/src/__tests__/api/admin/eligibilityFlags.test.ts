import { GET as listEligibilityFlags } from "~/app/api/admin/eligibility-flags/route";
import { POST as runEligibilityFlags } from "~/app/api/admin/eligibility-flags/run/route";
import { POST as reviewEligibilityFlag } from "~/app/api/admin/eligibility-flags/[id]/review/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockRequest,
  createMockSession,
  parseJsonResponse,
  createMockVoterRecord,
  DEFAULT_ACTIVE_TERM_ID,
  getMembershipMock,
  getAuditLogMock,
  getEligibilityFlagMock,
  RESOLVE_STALE_FLAGS_PARAMS,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  namedRawQueryValues,
  prismaMock,
  rawQueryMock,
} from "../../utils/mocks";

function reviewRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

/** Membership include shape for eligibility flag review (confirm → MEMBER_REMOVED audit). */
function createReviewMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: "membership-2",
    status: "ACTIVE",
    seatNumber: 3,
    voterRecordId: "TEST123456",
    committeeListId: 1,
    termId: DEFAULT_ACTIVE_TERM_ID,
    voterRecord: {
      VRCNUM: "TEST123456",
      firstName: "John",
      middleInitial: null,
      lastName: "Doe",
    },
    committeeList: {
      id: 1,
      cityTown: "Test City",
      legDistrict: 1,
      electionDistrict: 1,
    },
    term: {
      id: DEFAULT_ACTIVE_TERM_ID,
      label: "2024–2026",
    },
    ...overrides,
  };
}

describe("/api/admin/eligibility-flags", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
    getAuditLogMock(prismaMock).create.mockResolvedValue({});
  });

  it("lists eligibility flags with status/reason filters", async () => {
    getEligibilityFlagMock(prismaMock).findMany.mockResolvedValue([
      {
        id: "flag-1",
        reason: "PARTY_MISMATCH",
        status: "PENDING",
        createdAt: new Date("2026-02-20T00:00:00.000Z"),
        reviewedAt: null,
        reviewedBy: null,
        membership: {
          id: "membership-1",
          status: "ACTIVE",
          seatNumber: 1,
          committeeListId: 1,
          termId: "term-1",
          voterRecordId: "V1",
          voterRecord: {
            VRCNUM: "V1",
            firstName: "Jane",
            lastName: "Doe",
            party: "REP",
            stateAssmblyDistrict: "7",
          },
          committeeList: {
            id: 1,
            cityTown: "Rochester",
            legDistrict: 1,
            electionDistrict: 1,
          },
          term: {
            id: "term-1",
            label: "2026-2028",
          },
        },
      },
    ]);

    const response = await listEligibilityFlags(
      createMockRequest(
        {},
        { status: "PENDING", reason: "PARTY_MISMATCH" },
        { method: "GET" },
      ),
    );

    expect(response.status).toBe(200);
    expect(getEligibilityFlagMock(prismaMock).findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PENDING",
          reason: "PARTY_MISMATCH",
        }) as unknown,
      }) as unknown,
    );
  });

  it("runs manual eligibility flagging and returns summary", async () => {
    (prismaMock.committeeGovernanceConfig.findFirst as jest.Mock).mockResolvedValue({
      requiredPartyCode: "DEM",
      requireAssemblyDistrictMatch: true,
    });
    prismaMock.voterRecord.findFirst.mockResolvedValue({
      latestRecordEntryYear: 2026,
      latestRecordEntryNumber: 10,
    } as never);
    getMembershipMock(prismaMock).findMany.mockResolvedValue([]);
    getEligibilityFlagMock(prismaMock).findMany.mockResolvedValue([]);
    getEligibilityFlagMock(prismaMock).createMany.mockResolvedValue({
      count: 0,
    });

    const response = await runEligibilityFlags(
      createMockRequest({ termId: "term-1" }),
    );

    expect(response.status).toBe(200);
    const body = await parseJsonResponse<{
      termId: string;
      scanned: number;
      newFlags: number;
      existingPending: number;
      autoResolved: number;
    }>(response);
    expect(body.termId).toBe("term-1");
    expect(body.scanned).toBe(0);
    expect(body.newFlags).toBe(0);
    expect(body.existingPending).toBe(0);
    expect(body.autoResolved).toBe(0);
  });

  it("auto-resolves stale pending flags on re-scan and writes system audit context", async () => {
    (prismaMock.committeeGovernanceConfig.findFirst as jest.Mock).mockResolvedValue({
      requiredPartyCode: "DEM",
      requireAssemblyDistrictMatch: false,
    });
    prismaMock.voterRecord.findFirst.mockResolvedValue({
      latestRecordEntryYear: 2026,
      latestRecordEntryNumber: 10,
    } as never);
    getMembershipMock(prismaMock).findMany.mockResolvedValue([
      {
        id: "membership-1",
        committeeListId: 1,
        voterRecordId: "V1",
        committeeList: {
          cityTown: "Rochester",
          legDistrict: 1,
          electionDistrict: 1,
        },
        voterRecord: {
          party: "DEM",
          stateAssmblyDistrict: "7",
          latestRecordEntryYear: 2026,
          latestRecordEntryNumber: 10,
        },
      },
    ]);
    prismaMock.ltedDistrictCrosswalk.findMany.mockResolvedValue([]);
    getEligibilityFlagMock(prismaMock).findMany.mockResolvedValue([
      {
        id: "flag-stale-1",
        membershipId: "membership-1",
        reason: "PARTY_MISMATCH",
        details: { expectedPartyCode: "DEM", voterPartyCode: "REP" },
        sourceReportId: "cm1234567890abcdef123456",
      },
    ]);
    getEligibilityFlagMock(prismaMock).createMany.mockResolvedValue({
      count: 0,
    });
    // The guarded UPDATE ... RETURNING reports which flags it resolved.
    rawQueryMock("$queryRaw").mockResolvedValue([{ id: "flag-stale-1" }]);
    prismaMock.auditLog.createMany.mockResolvedValue({ count: 1 });

    const response = await runEligibilityFlags(
      createMockRequest({ termId: "term-1" }),
    );

    expect(response.status).toBe(200);
    const body = await parseJsonResponse<{
      autoResolved: number;
    }>(response);
    expect(body.autoResolved).toBe(1);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    const resolve = namedRawQueryValues(
      rawQueryMock("$queryRaw"),
      RESOLVE_STALE_FLAGS_PARAMS,
    );
    expect(resolve.reviewedById).toBe("system");
    expect(resolve.ids).toEqual(["flag-stale-1"]);

    expect(prismaMock.auditLog.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          action: "DISCREPANCY_RESOLVED",
          entityType: "EligibilityFlag",
          entityId: "flag-stale-1",
          metadata: expect.objectContaining({
            decision: "auto_resolve",
            actorType: "system",
            actorUserId: "system",
            flagId: "flag-stale-1",
            reason: "PARTY_MISMATCH",
          }) as unknown,
        }),
      ],
    });
  });

  it("dismiss decision updates flag status and logs DISCREPANCY_RESOLVED", async () => {
    getEligibilityFlagMock(prismaMock).findUnique.mockResolvedValue({
      id: "flag-1",
      reason: "PARTY_MISMATCH",
      status: "PENDING",
      details: null,
      membership: {
        id: "membership-1",
        status: "ACTIVE",
        seatNumber: 2,
      },
    });
    getEligibilityFlagMock(prismaMock).update.mockResolvedValue({});

    const response = await reviewEligibilityFlag(
      createMockRequest({ decision: "dismiss", notes: "Not actionable" }),
      reviewRouteContext("flag-1"),
    );

    expect(response.status).toBe(200);
    expect(getEligibilityFlagMock(prismaMock).update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "flag-1" },
        data: expect.objectContaining({
          status: "DISMISSED",
        }) as unknown,
      }) as unknown,
    );
    expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "DISCREPANCY_RESOLVED",
          metadata: expect.objectContaining({
            decision: "dismiss",
            flagId: "flag-1",
            reason: "PARTY_MISMATCH",
            reviewerUserId: "test-user-id",
            actorType: "reviewer",
          }) as unknown,
        }) as unknown,
      }) as unknown,
    );
  });

  it("confirm decision removes membership and marks flag confirmed", async () => {
    getEligibilityFlagMock(prismaMock).findUnique.mockResolvedValue({
      id: "flag-2",
      reason: "PARTY_MISMATCH",
      status: "PENDING",
      details: null,
      membership: createReviewMembership({ id: "membership-2" }),
    });
    getEligibilityFlagMock(prismaMock).update.mockResolvedValue({});
    getMembershipMock(prismaMock).update.mockResolvedValue({});

    const response = await reviewEligibilityFlag(
      createMockRequest({ decision: "confirm", notes: "Verified change" }),
      reviewRouteContext("flag-2"),
    );

    expect(response.status).toBe(200);
    expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "membership-2" },
        data: expect.objectContaining({
          status: "REMOVED",
          removalReason: "PARTY_CHANGE",
        }) as unknown,
      }) as unknown,
    );
    expect(getEligibilityFlagMock(prismaMock).update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "flag-2" },
        data: expect.objectContaining({
          status: "CONFIRMED",
        }) as unknown,
      }) as unknown,
    );
    expect(getAuditLogMock(prismaMock).create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          action: "MEMBER_REMOVED",
          metadata: expect.objectContaining({
            source: "boe_flagging",
            decision: "confirm",
            flagId: "flag-2",
            reason: "PARTY_MISMATCH",
            reviewerUserId: "test-user-id",
            actorType: "reviewer",
          }) as unknown,
        }) as unknown,
      }) as unknown,
    );
    expect(getAuditLogMock(prismaMock).create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          action: "DISCREPANCY_RESOLVED",
          metadata: expect.objectContaining({
            source: "boe_flagging",
            decision: "confirm",
            flagId: "flag-2",
            reason: "PARTY_MISMATCH",
            reviewerUserId: "test-user-id",
            actorType: "reviewer",
          }) as unknown,
        }) as unknown,
      }) as unknown,
    );
  });

  it("returns 500 when confirm decision audit write fails", async () => {
    getEligibilityFlagMock(prismaMock).findUnique.mockResolvedValue({
      id: "flag-3",
      reason: "PARTY_MISMATCH",
      status: "PENDING",
      details: null,
      membership: createReviewMembership({ id: "membership-3", seatNumber: 4 }),
    });
    getMembershipMock(prismaMock).update.mockResolvedValue({});
    getAuditLogMock(prismaMock).create.mockRejectedValueOnce(
      new Error("audit failure"),
    );

    const response = await reviewEligibilityFlag(
      createMockRequest({ decision: "confirm", notes: "Verified change" }),
      reviewRouteContext("flag-3"),
    );

    expect(response.status).toBe(500);
    expect(getMembershipMock(prismaMock).update).toHaveBeenCalled();
    expect(getEligibilityFlagMock(prismaMock).update).not.toHaveBeenCalled();
  });
});
