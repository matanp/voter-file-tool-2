/**
 * `/api/committee/remove` with Exit Reports: an Admin confirming a Leader's
 * report (`exitReportedAt` in the body), and a direct exit superseding one.
 * Both go through `writeMembershipExit`.
 */
import { PrivilegeLevel, type CommitteeMembership } from "@prisma/client";
import { POST } from "~/app/api/committee/remove/route";
import {
  createMockCommittee,
  createMockMembership,
  createMockRemoveCommitteeData,
  createMockRequest,
  createMockSession,
  createMockVoterRecord,
  expectAuditLogCreate,
  expectErrorResponse,
  expectMembershipExitWrite,
  jsonContaining,
  resolvesTo,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";

const REPORTED_AT = new Date("2026-10-30T15:04:05.678Z");

/** A record-not-found from a conditional `update` (Prisma P2025). */
const recordNotFound = Object.assign(new Error("Record to update not found."), {
  code: "P2025",
});

function adminWithReportedMember() {
  mockAuthSession(createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }));
  mockHasPermission(true);
  prismaMock.committeeList.findUnique.mockResolvedValue(createMockCommittee());
  prismaMock.voterRecord.findUnique.mockResolvedValue(createMockVoterRecord());
  const reported = {
    ...createMockMembership({
      seatNumber: 2,
      exitReportedAt: REPORTED_AT,
      exitReportedById: "leader-1",
      exitReportedKind: "RESIGNATION",
      removalNotes: "Leader's note",
    }),
    status: "ACTIVE",
    membershipType: null,
    submissionMetadata: null,
    removalReason: "OTHER",
    resignationMethod: "MAIL",
  } satisfies CommitteeMembership;
  prismaMock.committeeMembership.findUnique.mockResolvedValue(reported);
}

const resignBody = (overrides: Record<string, unknown> = {}) => ({
  cityTown: "Test City",
  legDistrict: 1,
  electionDistrict: 1,
  memberId: "TEST123456",
  action: "RESIGN",
  resignationReason: "MOVED_OUT_OF_DISTRICT",
  resignationDateReceived: "2026-10-28",
  resignationMethod: "EMAIL",
  ...overrides,
});

describe("/api/committee/remove with Exit Reports", () => {
  beforeEach(() => jest.clearAllMocks());

  it("confirms a reported resignation with the Admin's values, blanking notes the Admin cleared", async () => {
    adminWithReportedMember();

    const response = await POST(
      createMockRequest(resignBody({ exitReportedAt: REPORTED_AT.toISOString() })),
    );

    expect(response.status).toBe(200);
    expect(prismaMock.committeeMembership.update).toHaveBeenCalledWith(
      expectMembershipExitWrite("membership-test-id-001", {
        status: "RESIGNED",
        resignationDateReceived: new Date("2026-10-28"),
        resignationMethod: "EMAIL",
        removalReason: "MOVED_OUT_OF_DISTRICT",
        removalNotes: null,
        exitReportedAt: null,
        exitReportedById: null,
        exitReportedKind: null,
      }),
    );
    const where = prismaMock.committeeMembership.update.mock.calls[0]?.[0].where;
    expect(where?.exitReportedAt).toEqual(REPORTED_AT);
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_RESIGNED",
        metadata: jsonContaining({
          source: "exit_report",
          reportedById: "leader-1",
          reportedAt: REPORTED_AT.toISOString(),
        }),
      }),
    );
  });

  it("confirms a reported resignation as a removal when the Admin changes the kind", async () => {
    adminWithReportedMember();

    const response = await POST(
      createMockRequest(
        createMockRemoveCommitteeData({
          removalReason: "DECEASED",
          exitReportedAt: REPORTED_AT.toISOString(),
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(prismaMock.committeeMembership.update).toHaveBeenCalledWith(
      expectMembershipExitWrite("membership-test-id-001", {
        status: "REMOVED",
        removalReason: "DECEASED",
        removalNotes: null,
        resignationDateReceived: null,
        resignationMethod: null,
      }),
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_REMOVED",
        metadata: jsonContaining({ source: "exit_report" }),
      }),
    );
  });

  it("refuses to confirm a report that was rejected and filed again (409)", async () => {
    adminWithReportedMember();

    const response = await POST(
      createMockRequest(
        resignBody({ exitReportedAt: "2026-10-01T00:00:00.000Z" }),
      ),
    );

    await expectErrorResponse(response, 409, "This member changed, refresh.");
    expect(prismaMock.committeeMembership.update).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns 409 when the conditional write finds the row changed", async () => {
    adminWithReportedMember();
    prismaMock.committeeMembership.update.mockRejectedValue(recordNotFound);

    const response = await POST(
      createMockRequest(resignBody({ exitReportedAt: REPORTED_AT.toISOString() })),
    );

    await expectErrorResponse(response, 409, "This member changed, refresh.");
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it("supersedes a report filed after the Admin's read instead of answering 409", async () => {
    adminWithReportedMember();
    // The route read the row before the Leader's report landed.
    const beforeReport = {
      ...createMockMembership({ seatNumber: 2 }),
      status: "ACTIVE",
      membershipType: null,
      submissionMetadata: null,
      removalReason: null,
      resignationMethod: null,
    } satisfies CommitteeMembership;
    prismaMock.committeeMembership.findUnique
      .mockResolvedValueOnce(beforeReport)
      .mockResolvedValueOnce({
        ...beforeReport,
        exitReportedAt: REPORTED_AT,
        exitReportedById: "leader-1",
        exitReportedKind: "REMOVAL",
      });
    prismaMock.committeeMembership.update.mockRejectedValueOnce(recordNotFound);
    const response = await POST(
      createMockRequest(
        createMockRemoveCommitteeData({ removalReason: "PARTY_CHANGE" }),
      ),
    );

    expect(response.status).toBe(200);
    const wheres = prismaMock.committeeMembership.update.mock.calls.map(
      ([args]) => args.where.exitReportedAt,
    );
    expect(wheres).toEqual([null, undefined]);
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_REMOVED",
        metadata: jsonContaining({
          supersededExitReport: {
            reportedById: "leader-1",
            reportedAt: REPORTED_AT.toISOString(),
            kind: "REMOVAL",
          },
        }),
      }),
    );
  });

  it("does not fail an ACTIVE exit after repeated report-state changes", async () => {
    adminWithReportedMember();
    const beforeReport = {
      ...createMockMembership({ seatNumber: 2 }),
      status: "ACTIVE",
      membershipType: null,
      submissionMetadata: null,
      removalReason: null,
      resignationMethod: null,
    } satisfies CommitteeMembership;
    const reports = [1, 2, 3, 4].map((second) => ({
      ...beforeReport,
      exitReportedAt: new Date(`2026-10-30T15:04:0${String(second)}.000Z`),
      exitReportedById: `leader-${String(second)}`,
      exitReportedKind: "REMOVAL" as const,
    }));
    let locked = false;
    let unlockedRead = 0;
    prismaMock.$queryRaw.mockImplementation(() => {
      locked = true;
      return resolvesTo<Array<{ id: string }>>([{ id: beforeReport.id }]);
    });
    prismaMock.committeeMembership.findUnique.mockImplementation(() => {
      if (locked) return resolvesTo<CommitteeMembership>(reports.at(-1)!);
      if (unlockedRead === 0) {
        unlockedRead += 1;
        return resolvesTo<CommitteeMembership>(beforeReport);
      }
      const report = reports[Math.min(unlockedRead - 1, reports.length - 1)]!;
      unlockedRead += 1;
      return resolvesTo<CommitteeMembership>(report);
    });
    prismaMock.committeeMembership.update.mockImplementation((args) => {
      const expectedAt = args.where.exitReportedAt;
      if (expectedAt !== undefined) throw recordNotFound;
      return resolvesTo(
        createMockMembership({ id: beforeReport.id, status: "REMOVED" }),
      );
    });

    const response = await POST(
      createMockRequest(
        createMockRemoveCommitteeData({ removalReason: "PARTY_CHANGE" }),
      ),
    );

    expect(response.status).toBe(200);
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_REMOVED",
        metadata: jsonContaining({
          supersededExitReport: {
            reportedById: "leader-4",
            reportedAt: reports.at(-1)!.exitReportedAt.toISOString(),
            kind: "REMOVAL",
          },
        }),
      }),
    );
  });

  it("supersedes a pending report on a direct removal and records it in the audit", async () => {
    adminWithReportedMember();

    const response = await POST(
      createMockRequest(createMockRemoveCommitteeData({ removalReason: "PARTY_CHANGE" })),
    );

    expect(response.status).toBe(200);
    expect(prismaMock.committeeMembership.update).toHaveBeenCalledWith(
      expectMembershipExitWrite("membership-test-id-001", {
        status: "REMOVED",
        removalReason: "PARTY_CHANGE",
        // The Leader's reported notes and method don't survive as recorded facts.
        removalNotes: null,
        resignationMethod: null,
        exitReportedAt: null,
      }),
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "MEMBER_REMOVED",
        metadata: jsonContaining({
          source: "manual",
          supersededExitReport: {
            reportedById: "leader-1",
            reportedAt: REPORTED_AT.toISOString(),
            kind: "RESIGNATION",
          },
        }),
      }),
    );
  });
});
