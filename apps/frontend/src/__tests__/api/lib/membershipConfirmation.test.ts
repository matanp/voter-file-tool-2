/**
 * Tests for SUBMITTED → ACTIVE / REJECTED membership confirmation service.
 */

import { PrivilegeLevel, type CommitteeMembership } from "@prisma/client";
import {
  confirmSubmittedMembership,
  rejectSubmittedMembership,
} from "~/app/api/lib/membershipConfirmation";
import { prismaMock } from "../../utils/mocks";
import {
  createMockMembership,
  expectAuditLogCreate,
  expectMembershipUpdate,
  expectMembershipExitWrite,
  expectMembershipUpdateMany,
  getAuditLogMock,
  getMembershipMock,
  jsonContaining,
  setupMembershipAuditSubjectMocks,
  stubMembershipRows,
} from "../../utils/testUtils";

const ACTOR = {
  userId: "test-user-id",
  userRole: PrivilegeLevel.Admin,
};

const MEMBERSHIP_ID = "membership-test-id-001";
const OUTGOING_ID = "membership-target-id-002";
const MAX_SEATS = 4;
const REPORTED_AT = new Date("2026-10-30T15:04:05.678Z");

const stubMemberships = (rows: CommitteeMembership[]) =>
  stubMembershipRows(prismaMock, rows);

const candidate = (overrides: Partial<CommitteeMembership> = {}) =>
  createMockMembership({ id: MEMBERSHIP_ID, status: "SUBMITTED", ...overrides });

/** An ACTIVE member whose Exit Report is paired with the candidate. */
const pairedOutgoing = (overrides: Partial<CommitteeMembership> = {}) =>
  createMockMembership({
    id: OUTGOING_ID,
    voterRecordId: "OLD_MEMBER_ID",
    status: "ACTIVE",
    seatNumber: 2,
    exitReportedAt: REPORTED_AT,
    exitReportedById: "leader-1",
    exitReportedKind: "REMOVAL",
    removalReason: "MOVED_OUT_OF_DISTRICT",
    removalNotes: "Moved to Ohio",
    replacementMembershipId: MEMBERSHIP_ID,
    ...overrides,
  });

const confirm = () =>
  confirmSubmittedMembership(prismaMock, {
    membershipId: MEMBERSHIP_ID,
    meetingRecordId: "meeting-001",
    actor: ACTOR,
    maxSeats: MAX_SEATS,
    membershipType: "APPOINTED",
  });

describe("membershipConfirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMembershipAuditSubjectMocks(prismaMock);
    prismaMock.$queryRaw.mockResolvedValue([] as never);
    getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
    getMembershipMock(prismaMock).findMany.mockResolvedValue([]);
    getMembershipMock(prismaMock).update.mockResolvedValue({});
    getMembershipMock(prismaMock).updateMany.mockResolvedValue({ count: 1 });
    getAuditLogMock(prismaMock).create.mockResolvedValue({});
    (prismaMock.seat as { count: jest.Mock }).count = jest
      .fn()
      .mockResolvedValue(4);
    (prismaMock.seat as { findMany: jest.Mock }).findMany = jest
      .fn()
      .mockResolvedValue([
        { seatNumber: 1 },
        { seatNumber: 2 },
        { seatNumber: 3 },
        { seatNumber: 4 },
      ]);
  });

  describe("confirmSubmittedMembership", () => {
    it("returns accepted and logs MEMBER_CONFIRMED + MEMBER_ACTIVATED", async () => {
      stubMemberships([candidate()]);
      getMembershipMock(prismaMock).count.mockResolvedValue(2);

      const result = await confirmSubmittedMembership(prismaMock, {
        membershipId: MEMBERSHIP_ID,
        meetingRecordId: "meeting-001",
        actor: ACTOR,
        maxSeats: MAX_SEATS,
        membershipType: "APPOINTED",
      });

      expect(result).toEqual({ kind: "accepted" });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          {
            status: "ACTIVE",
            membershipType: "APPOINTED",
            meetingRecordId: "meeting-001",
          },
          { id: MEMBERSHIP_ID },
        ),
      );
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({ action: "MEMBER_CONFIRMED" }),
      );
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({ action: "MEMBER_ACTIVATED" }),
      );
    });

    it("uses caller-resolved membershipType in update and audit snapshots", async () => {
      stubMemberships([candidate({ membershipType: "PETITIONED" })]);
      getMembershipMock(prismaMock).count.mockResolvedValue(0);

      await confirmSubmittedMembership(prismaMock, {
        membershipId: MEMBERSHIP_ID,
        meetingRecordId: "meeting-001",
        actor: ACTOR,
        maxSeats: MAX_SEATS,
        membershipType: "PETITIONED",
      });

      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          { status: "ACTIVE", membershipType: "PETITIONED" },
          { id: MEMBERSHIP_ID },
        ),
      );
    });

    it("returns notFound when membership is missing", async () => {
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);

      const result = await confirmSubmittedMembership(prismaMock, {
        membershipId: MEMBERSHIP_ID,
        meetingRecordId: "meeting-001",
        actor: ACTOR,
        maxSeats: MAX_SEATS,
        membershipType: "APPOINTED",
      });

      expect(result).toEqual({ kind: "notFound" });
    });

    it("returns notSubmitted when status is not SUBMITTED", async () => {
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ id: MEMBERSHIP_ID, status: "ACTIVE" }),
      );

      const result = await confirmSubmittedMembership(prismaMock, {
        membershipId: MEMBERSHIP_ID,
        meetingRecordId: "meeting-001",
        actor: ACTOR,
        maxSeats: MAX_SEATS,
        membershipType: "APPOINTED",
      });

      expect(result).toEqual({ kind: "notSubmitted" });
    });

    it("returns anotherCommittee when voter is ACTIVE elsewhere", async () => {
      stubMemberships([candidate()]);
      getMembershipMock(prismaMock).findFirst.mockResolvedValue({
        id: "other-membership",
      });

      const result = await confirmSubmittedMembership(prismaMock, {
        membershipId: MEMBERSHIP_ID,
        meetingRecordId: "meeting-001",
        actor: ACTOR,
        maxSeats: MAX_SEATS,
        membershipType: "APPOINTED",
      });

      expect(result).toEqual({ kind: "anotherCommittee" });
    });

    it("treats a leftover submissionMetadata.removeMemberId as a plain add", async () => {
      stubMemberships([
        candidate({ submissionMetadata: { removeMemberId: "OLD_MEMBER_ID" } }),
        createMockMembership({
          id: OUTGOING_ID,
          voterRecordId: "OLD_MEMBER_ID",
          status: "ACTIVE",
        }),
      ]);
      getMembershipMock(prismaMock).count.mockResolvedValue(2);

      expect(await confirm()).toEqual({ kind: "accepted" });
      expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalledWith(
        expectMembershipExitWrite(OUTGOING_ID, {}),
      );
    });

    it("returns atCapacity and auto-rejects with MEMBER_REJECTED audit", async () => {
      stubMemberships([candidate()]);
      getMembershipMock(prismaMock).count.mockResolvedValue(4);

      const result = await confirmSubmittedMembership(prismaMock, {
        membershipId: MEMBERSHIP_ID,
        meetingRecordId: "meeting-001",
        actor: ACTOR,
        maxSeats: MAX_SEATS,
        membershipType: "APPOINTED",
      });

      expect(result).toEqual({ kind: "atCapacity" });
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          {
            status: "REJECTED",
            rejectionNote: "Committee already full",
          },
          { id: MEMBERSHIP_ID },
        ),
      );
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({ action: "MEMBER_REJECTED" }),
      );
    });

    it("accepts replacement at capacity when replacement frees a seat (1.R.14)", async () => {
      stubMemberships([candidate(), pairedOutgoing()]);
      getMembershipMock(prismaMock).count.mockResolvedValue(4);

      expect(await confirm()).toEqual({ kind: "accepted" });
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipExitWrite(OUTGOING_ID, { status: "REMOVED" }),
      );
    });

    it("records the paired report's removal as reported, on exactly that report", async () => {
      stubMemberships([candidate(), pairedOutgoing()]);
      getMembershipMock(prismaMock).count.mockResolvedValue(2);

      expect(await confirm()).toEqual({ kind: "accepted" });
      const updates = getMembershipMock(prismaMock).update.mock.calls as Array<
        [{ where: { id: string } }]
      >;
      const exitWrite = updates.find(([args]) => args.where.id === OUTGOING_ID)?.[0];
      expect(exitWrite).toEqual({
        where: { id: OUTGOING_ID, status: "ACTIVE", exitReportedAt: REPORTED_AT },
        data: expect.objectContaining({
          status: "REMOVED",
          removalReason: "MOVED_OUT_OF_DISTRICT",
          removalNotes: "Moved to Ohio",
          resignationDateReceived: null,
          resignationMethod: null,
          seatNumber: null,
          exitReportedAt: null,
          exitReportedKind: null,
          replacementMembershipId: null,
        }),
      });
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_REMOVED",
          entityId: OUTGOING_ID,
          afterValue: jsonContaining({
            status: "REMOVED",
            removalReason: "MOVED_OUT_OF_DISTRICT",
            removalNotes: "Moved to Ohio",
          }),
          metadata: jsonContaining({
            reason: "replacement",
            replacementMembershipId: MEMBERSHIP_ID,
            reportedById: "leader-1",
            reportedAt: REPORTED_AT.toISOString(),
          }),
        }),
      );
    });

    it("records a paired resignation as RESIGNED with the reported date and method", async () => {
      stubMemberships([
        candidate(),
        pairedOutgoing({
          exitReportedKind: "RESIGNATION",
          removalReason: null,
          removalNotes: null,
          resignationDateReceived: new Date("2026-10-28T00:00:00.000Z"),
          resignationMethod: "EMAIL",
        }),
      ]);
      getMembershipMock(prismaMock).count.mockResolvedValue(2);

      expect(await confirm()).toEqual({ kind: "accepted" });
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipExitWrite(OUTGOING_ID, {
          status: "RESIGNED",
          resignationDateReceived: new Date("2026-10-28T00:00:00.000Z"),
          resignationMethod: "EMAIL",
          removalReason: null,
        }),
      );
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_RESIGNED",
          entityId: OUTGOING_ID,
          afterValue: jsonContaining({
            status: "RESIGNED",
            resignationDateReceived: "2026-10-28",
          }),
          metadata: jsonContaining({
            reason: "replacement",
            replacementMembershipId: MEMBERSHIP_ID,
          }),
        }),
      );
    });

    it("refuses a paired report that lacks what its exit needs, writing nothing", async () => {
      stubMemberships([
        candidate(),
        pairedOutgoing({
          exitReportedKind: "RESIGNATION",
          removalReason: null,
          resignationDateReceived: null,
          resignationMethod: null,
        }),
      ]);
      getMembershipMock(prismaMock).count.mockResolvedValue(2);

      const result = await confirm();
      expect(result).toMatchObject({ kind: "replacementExitIncomplete" });
      expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
      expect(getAuditLogMock(prismaMock).create).not.toHaveBeenCalled();
    });

    it("returns replacementTargetInvalid when the paired report changed before the write", async () => {
      stubMemberships([candidate(), pairedOutgoing()]);
      getMembershipMock(prismaMock).count.mockResolvedValue(2);
      getMembershipMock(prismaMock).update.mockRejectedValueOnce(
        Object.assign(new Error("Record to update not found."), { code: "P2025" }),
      );

      expect(await confirm()).toEqual({ kind: "replacementTargetInvalid" });
      expect(getAuditLogMock(prismaMock).create).not.toHaveBeenCalledWith(
        expectAuditLogCreate({ action: "MEMBER_ACTIVATED" }),
      );
    });

    it("rejects the paired report too when capacity auto-rejects the candidate", async () => {
      stubMemberships([candidate(), pairedOutgoing()]);
      // Overfull: even with the outgoing seat counted free, no room.
      getMembershipMock(prismaMock).count.mockResolvedValue(6);

      expect(await confirm()).toEqual({ kind: "atCapacity" });
      expect(getMembershipMock(prismaMock).updateMany).toHaveBeenCalledWith({
        where: { id: OUTGOING_ID, status: "ACTIVE", exitReportedAt: REPORTED_AT },
        data: expect.objectContaining({
          exitReportedAt: null,
          removalReason: null,
          replacementMembershipId: null,
        }),
      });
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_EXIT_REPORT_REJECTED",
          entityId: OUTGOING_ID,
          metadata: jsonContaining({ reason: "replacement_rejected" }),
        }),
      );
    });

    it("throws when audit write fails (OrThrow contract)", async () => {
      stubMemberships([candidate()]);
      getMembershipMock(prismaMock).count.mockResolvedValue(2);
      getAuditLogMock(prismaMock).create.mockRejectedValue(
        new Error("Audit write failed"),
      );

      await expect(
        confirmSubmittedMembership(prismaMock, {
          membershipId: MEMBERSHIP_ID,
          meetingRecordId: "meeting-001",
          actor: ACTOR,
          maxSeats: MAX_SEATS,
          membershipType: "APPOINTED",
        }),
      ).rejects.toThrow("Audit write failed");
    });
  });

  describe("rejectSubmittedMembership", () => {
    it("returns rejected and logs MEMBER_REJECTED with richer before snapshot", async () => {
      stubMemberships([candidate({ rejectionNote: null, meetingRecordId: null })]);

      const result = await rejectSubmittedMembership(prismaMock, {
        membershipId: MEMBERSHIP_ID,
        actor: ACTOR,
        meetingRecordId: "meeting-001",
        rejectionNote: "Not eligible",
      });

      expect(result).toEqual({ kind: "rejected" });
      expect(getMembershipMock(prismaMock).updateMany).toHaveBeenCalledWith(
        expectMembershipUpdateMany(
          {
            status: "REJECTED",
            rejectionNote: "Not eligible",
            meetingRecordId: "meeting-001",
          },
          { id: MEMBERSHIP_ID, status: "SUBMITTED" },
        ),
      );
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({ action: "MEMBER_REJECTED" }),
      );
    });

    it("rejects the paired Exit Report too, leaving the outgoing member ACTIVE", async () => {
      stubMemberships([candidate(), pairedOutgoing()]);

      const result = await rejectSubmittedMembership(prismaMock, {
        membershipId: MEMBERSHIP_ID,
        actor: ACTOR,
        meetingRecordId: "meeting-001",
        auditMetadata: { meetingRecordId: "meeting-001" },
      });

      expect(result).toEqual({ kind: "rejected" });
      expect(getMembershipMock(prismaMock).updateMany).toHaveBeenCalledWith({
        where: { id: OUTGOING_ID, status: "ACTIVE", exitReportedAt: REPORTED_AT },
        data: {
          exitReportedAt: null,
          exitReportedById: null,
          exitReportedKind: null,
          replacementMembershipId: null,
          resignationDateReceived: null,
          resignationMethod: null,
          removalReason: null,
          removalNotes: null,
        },
      });
      expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "MEMBER_EXIT_REPORT_REJECTED",
          entityId: OUTGOING_ID,
          afterValue: jsonContaining({ status: "ACTIVE" }),
          metadata: jsonContaining({
            reason: "replacement_rejected",
            replacementMembershipId: MEMBERSHIP_ID,
            reportedById: "leader-1",
            reportedAt: REPORTED_AT.toISOString(),
            meetingRecordId: "meeting-001",
          }),
        }),
      );
    });

    it("writes no exit-report rejection for a plain add", async () => {
      stubMemberships([candidate()]);

      await rejectSubmittedMembership(prismaMock, {
        membershipId: MEMBERSHIP_ID,
        actor: ACTOR,
      });

      expect(getMembershipMock(prismaMock).updateMany).toHaveBeenCalledTimes(1);
      expect(getAuditLogMock(prismaMock).create).not.toHaveBeenCalledWith(
        expectAuditLogCreate({ action: "MEMBER_EXIT_REPORT_REJECTED" }),
      );
    });

    it("returns notSubmitted when updateMany affects zero rows", async () => {
      stubMemberships([candidate()]);
      getMembershipMock(prismaMock).updateMany.mockResolvedValue({ count: 0 });

      const result = await rejectSubmittedMembership(prismaMock, {
        membershipId: MEMBERSHIP_ID,
        actor: ACTOR,
      });

      expect(result).toEqual({ kind: "notSubmitted" });
      expect(getAuditLogMock(prismaMock).create).not.toHaveBeenCalled();
    });

    it("returns notFound when membership is missing", async () => {
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);

      const result = await rejectSubmittedMembership(prismaMock, {
        membershipId: MEMBERSHIP_ID,
        actor: ACTOR,
      });

      expect(result).toEqual({ kind: "notFound" });
    });
  });
});
