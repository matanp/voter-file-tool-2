import { GET as listEligibilityFlags } from "~/app/api/admin/eligibility-flags/route";
import { POST as runEligibilityFlags } from "~/app/api/admin/eligibility-flags/run/route";
import { POST as reviewEligibilityFlag } from "~/app/api/admin/eligibility-flags/[id]/review/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockRequest,
  createMockSession,
  parseJsonResponse,
  getMembershipMock,
  getAuditLogMock,
  getEligibilityFlagMock,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";

function reviewRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
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
    }>(response);
    expect(body.termId).toBe("term-1");
    expect(body.scanned).toBe(0);
    expect(body.newFlags).toBe(0);
    expect(body.existingPending).toBe(0);
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
      membership: {
        id: "membership-2",
        status: "ACTIVE",
        seatNumber: 3,
      },
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
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "MEMBER_REMOVED",
        }) as unknown,
      }) as unknown,
    );
  });
});
