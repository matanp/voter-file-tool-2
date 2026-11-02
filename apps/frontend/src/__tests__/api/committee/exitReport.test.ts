import { PrivilegeLevel, type UserJurisdiction } from "@prisma/client";
import { POST as reportExit } from "~/app/api/committee/exitReport/route";
import { POST as rejectExitReport } from "~/app/api/committee/exitReport/reject/route";
import { GET as getExitInstructions } from "~/app/api/committee/exit-instructions/route";
import {
  createMockCommittee,
  createMockMembership,
  createMockRequest,
  createMockSession,
  createMockVoterRecord,
  expectAuditLogCreate,
  expectErrorResponse,
  jsonContaining,
  parseJsonResponse,
  selectedRow,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";
import { exitInstructionsResponseSchema } from "~/lib/validations/committee";

const REPORTED_AT = new Date("2026-10-30T15:04:05.678Z");

const reportBody = (overrides: Record<string, unknown> = {}) => ({
  cityTown: "Test City",
  legDistrict: 1,
  electionDistrict: 1,
  memberId: "TEST123456",
  kind: "RESIGNATION",
  removalReason: "MOVED_OUT_OF_DISTRICT",
  ...overrides,
});

function signIn(privilegeLevel: PrivilegeLevel, granted = true) {
  mockAuthSession(createMockSession({ user: { privilegeLevel } }));
  mockHasPermission(granted);
}

function leaderJurisdictions(
  rows: Array<Pick<UserJurisdiction, "cityTown" | "legDistrict">>,
) {
  prismaMock.userJurisdiction.findMany.mockResolvedValue(
    rows.map((r, i) => ({
      id: `j-${i}`,
      userId: "test-user-id",
      termId: "term-default-2024-2026",
      createdAt: new Date("2026-01-01"),
      createdById: "admin-1",
      ...r,
    })),
  );
}

/** An ACTIVE member of the committee, with `include: { voterRecord }`. */
function activeMember(
  overrides: Parameters<typeof createMockMembership>[0] = {},
) {
  return {
    ...createMockMembership({ status: "ACTIVE", seatNumber: 2, ...overrides }),
    voterRecord: createMockVoterRecord(),
  };
}

/**
 * The routes read memberships with `include` (voterRecord, committee, term);
 * the deep-mock delegate is typed to the bare model, so included rows cross
 * here once.
 */
function resolveIncludedMembership(row: object): void {
  prismaMock.committeeMembership.findUnique.mockResolvedValue(selectedRow(row));
}

/** The first conditional `updateMany` the route made, from the typed delegate. */
function updateManyArgs() {
  const args = prismaMock.committeeMembership.updateMany.mock.calls[0]?.[0];
  if (!args)
    throw new Error("expected committeeMembership.updateMany to be called");
  return args;
}

describe("POST /api/committee/exitReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.committeeList.findUnique.mockResolvedValue(
      createMockCommittee({ cityTown: "Test City", legDistrict: 1 }),
    );
    resolveIncludedMembership(activeMember());
    prismaMock.committeeMembership.updateMany.mockResolvedValue({ count: 1 });
  });

  it("returns 401 when signed out", async () => {
    mockAuthSession(null);
    const response = await reportExit(createMockRequest(reportBody()));
    await expectErrorResponse(response, 401, "Please log in");
  });

  it("returns 403 for ReadAccess", async () => {
    signIn(PrivilegeLevel.ReadAccess, false);
    const response = await reportExit(createMockRequest(reportBody()));
    await expectErrorResponse(
      response,
      403,
      "User does not have sufficient privilege",
    );
    expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
  });

  it("files a Leader's report in their jurisdiction without changing the member's status", async () => {
    signIn(PrivilegeLevel.Leader);
    leaderJurisdictions([{ cityTown: "Test City", legDistrict: 1 }]);

    const response = await reportExit(
      createMockRequest(
        reportBody({
          removalReason: "OTHER",
          removalNotes: "  Moving to Ohio  ",
          resignationDateReceived: "2026-10-29",
          resignationMethod: "EMAIL",
        }),
      ),
    );

    expect(response.status).toBe(201);
    const args = updateManyArgs();
    expect(args.where).toEqual({
      id: "membership-test-id-001",
      status: "ACTIVE",
      exitReportedAt: null,
    });
    expect(args.data).toMatchObject({
      exitReportedById: "test-user-id",
      exitReportedKind: "RESIGNATION",
      removalReason: "OTHER",
      removalNotes: "Moving to Ohio",
      resignationMethod: "EMAIL",
      resignationDateReceived: new Date("2026-10-29"),
    });
    expect(args.data).not.toHaveProperty("status");
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_EXIT_REPORTED",
        entityType: "CommitteeMembership",
        entityId: "membership-test-id-001",
        afterValue: jsonContaining({
          status: "ACTIVE",
          exitReportedKind: "RESIGNATION",
          removalReason: "OTHER",
        }),
      }),
    );
  });

  it("lets RequestAccess file a report (no jurisdiction scoping, as requestAdd)", async () => {
    signIn(PrivilegeLevel.RequestAccess);
    const response = await reportExit(
      createMockRequest(
        reportBody({ kind: "REMOVAL", removalReason: "DECEASED" }),
      ),
    );
    expect(response.status).toBe(201);
    expect(prismaMock.userJurisdiction.findMany).not.toHaveBeenCalled();
    const args = updateManyArgs();
    expect(args.data).toMatchObject({
      exitReportedKind: "REMOVAL",
      resignationDateReceived: null,
      resignationMethod: null,
      removalNotes: null,
    });
  });

  it("returns 403 for a Leader outside their jurisdictions", async () => {
    signIn(PrivilegeLevel.Leader);
    leaderJurisdictions([{ cityTown: "Other Town", legDistrict: 1 }]);
    const response = await reportExit(createMockRequest(reportBody()));
    await expectErrorResponse(
      response,
      403,
      "You do not have jurisdiction access for this committee",
    );
    expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
  });

  it("returns 400 for a member who isn't ACTIVE", async () => {
    signIn(PrivilegeLevel.RequestAccess);
    resolveIncludedMembership(activeMember({ status: "RESIGNED" }));
    const response = await reportExit(createMockRequest(reportBody()));
    expect(response.status).toBe(400);
    expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
  });

  it("returns 409 when the member already has a pending report", async () => {
    signIn(PrivilegeLevel.RequestAccess);
    resolveIncludedMembership(
      activeMember({
        exitReportedAt: REPORTED_AT,
        exitReportedKind: "REMOVAL",
      }),
    );
    const response = await reportExit(createMockRequest(reportBody()));
    expect(response.status).toBe(409);
    expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
  });

  it("returns 409 when a concurrent report wins the conditional update", async () => {
    signIn(PrivilegeLevel.RequestAccess);
    prismaMock.committeeMembership.updateMany.mockResolvedValue({ count: 0 });
    const response = await reportExit(createMockRequest(reportBody()));
    expect(response.status).toBe(409);
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it.each([
    ["Other without notes", { removalReason: "OTHER" }],
    ["no kind", { kind: undefined }],
    [
      "resignation details on a removal",
      { kind: "REMOVAL", resignationMethod: "MAIL" },
    ],
    ["an unknown field", { removeMemberId: "X" }],
  ])("returns 422 for %s", async (_label, overrides) => {
    signIn(PrivilegeLevel.Leader);
    const response = await reportExit(createMockRequest(reportBody(overrides)));
    expect(response.status).toBe(422);
  });
});

describe("POST /api/committee/exitReport/reject", () => {
  const body = (overrides: Record<string, unknown> = {}) => ({
    membershipId: "membership-test-id-001",
    exitReportedAt: REPORTED_AT.toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resolveIncludedMembership({
      ...activeMember({
        exitReportedAt: REPORTED_AT,
        exitReportedKind: "RESIGNATION",
        exitReportedById: "leader-1",
        removalReason: "OTHER",
      }),
      committeeList: createMockCommittee(),
      term: { id: "term-default-2024-2026", label: "2024–2026" },
    });
    prismaMock.committeeMembership.updateMany.mockResolvedValue({ count: 1 });
  });

  it("returns 401 when signed out", async () => {
    mockAuthSession(null);
    const response = await rejectExitReport(createMockRequest(body()));
    await expectErrorResponse(response, 401, "Please log in");
    expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
  });

  it("returns 403 for a Leader", async () => {
    signIn(PrivilegeLevel.Leader, false);
    const response = await rejectExitReport(createMockRequest(body()));
    await expectErrorResponse(
      response,
      403,
      "User does not have sufficient privilege",
    );
    expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
  });

  it("clears the report and the four exit fields, conditional on the report the Admin saw", async () => {
    signIn(PrivilegeLevel.Admin);
    const response = await rejectExitReport(
      createMockRequest(body({ note: "Letter never arrived" })),
    );

    expect(response.status).toBe(200);
    const args = updateManyArgs();
    expect(args.where).toEqual({
      id: "membership-test-id-001",
      status: "ACTIVE",
      exitReportedAt: REPORTED_AT,
    });
    expect(args.data).toEqual({
      exitReportedAt: null,
      exitReportedById: null,
      exitReportedKind: null,
      resignationDateReceived: null,
      resignationMethod: null,
      removalReason: null,
      removalNotes: null,
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_EXIT_REPORT_REJECTED",
        beforeValue: jsonContaining({ exitReportedKind: "RESIGNATION" }),
        metadata: jsonContaining({
          reportedById: "leader-1",
          reportedAt: REPORTED_AT.toISOString(),
          rejectionNote: "Letter never arrived",
        }),
      }),
    );
  });

  it("returns 409 for a report rejected and filed again since the Admin loaded it", async () => {
    signIn(PrivilegeLevel.Admin);
    const response = await rejectExitReport(
      createMockRequest(body({ exitReportedAt: "2026-10-01T00:00:00.000Z" })),
    );
    await expectErrorResponse(response, 409, "This member changed, refresh.");
    expect(prismaMock.committeeMembership.updateMany).not.toHaveBeenCalled();
  });

  it("returns 409 when the conditional update finds the row changed", async () => {
    signIn(PrivilegeLevel.Admin);
    prismaMock.committeeMembership.updateMany.mockResolvedValue({ count: 0 });
    const response = await rejectExitReport(createMockRequest(body()));
    await expectErrorResponse(response, 409, "This member changed, refresh.");
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/committee/exit-instructions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when signed out", async () => {
    mockAuthSession(null);
    const response = await getExitInstructions(createMockRequest());
    expect(response.status).toBe(401);
  });

  it("returns 403 for ReadAccess", async () => {
    signIn(PrivilegeLevel.ReadAccess, false);
    const response = await getExitInstructions(createMockRequest());
    expect(response.status).toBe(403);
  });

  it("returns only the instructions text to RequestAccess", async () => {
    signIn(PrivilegeLevel.RequestAccess);
    prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
      selectedRow<{ exitReportInstructions: string }>({
        exitReportInstructions: "  Send the letter to chair@example.org  ",
      }),
    );
    const response = await getExitInstructions(createMockRequest());

    expect(response.status).toBe(200);
    const body = await parseJsonResponse<unknown>(response);
    expect(exitInstructionsResponseSchema.strict().parse(body)).toEqual({
      text: "Send the letter to chair@example.org",
    });
    expect(prismaMock.committeeGovernanceConfig.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ select: { exitReportInstructions: true } }),
    );
  });

  it("returns null text when none is set", async () => {
    signIn(PrivilegeLevel.Leader);
    prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
      selectedRow<{ exitReportInstructions: string }>({
        exitReportInstructions: "   ",
      }),
    );
    const response = await getExitInstructions(createMockRequest());
    expect(await parseJsonResponse<unknown>(response)).toEqual({ text: null });
  });
});
