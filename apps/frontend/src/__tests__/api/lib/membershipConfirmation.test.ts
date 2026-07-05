/**
 * Tests for SUBMITTED → ACTIVE / REJECTED membership confirmation service.
 */

import { PrivilegeLevel } from "@prisma/client";
import {
  confirmSubmittedMembership,
  rejectSubmittedMembership,
} from "~/app/api/lib/membershipConfirmation";
import { prismaMock } from "../../utils/mocks";
import {
  createMockMembership,
  expectAuditLogCreate,
  expectMembershipUpdate,
  expectMembershipUpdateMany,
  getAuditLogMock,
  getMembershipMock,
  setupMembershipAuditSubjectMocks,
} from "../../utils/testUtils";

const ACTOR = {
  userId: "test-user-id",
  userRole: PrivilegeLevel.Admin,
};

const MEMBERSHIP_ID = "membership-test-id-001";
const MAX_SEATS = 4;

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
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ id: MEMBERSHIP_ID, status: "SUBMITTED" }),
      );
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
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({
          id: MEMBERSHIP_ID,
          status: "SUBMITTED",
          membershipType: "PETITIONED",
        }),
      );
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
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ id: MEMBERSHIP_ID, status: "SUBMITTED" }),
      );
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

    it("returns replacementTargetInvalid when replacement is not ACTIVE", async () => {
      getMembershipMock(prismaMock).findUnique
        .mockResolvedValueOnce(
          createMockMembership({
            id: MEMBERSHIP_ID,
            status: "SUBMITTED",
            submissionMetadata: { removeMemberId: "OLD_MEMBER_ID" },
          }),
        )
        .mockResolvedValueOnce(null);

      const result = await confirmSubmittedMembership(prismaMock, {
        membershipId: MEMBERSHIP_ID,
        meetingRecordId: "meeting-001",
        actor: ACTOR,
        maxSeats: MAX_SEATS,
        membershipType: "APPOINTED",
      });

      expect(result).toEqual({ kind: "replacementTargetInvalid" });
    });

    it("returns atCapacity and auto-rejects with MEMBER_REJECTED audit", async () => {
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ id: MEMBERSHIP_ID, status: "SUBMITTED" }),
      );
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
      const replacementTarget = createMockMembership({
        id: "membership-target-id-002",
        voterRecordId: "OLD_MEMBER_ID",
        status: "ACTIVE",
        seatNumber: 2,
      });
      getMembershipMock(prismaMock).findUnique
        .mockResolvedValueOnce(
          createMockMembership({
            id: MEMBERSHIP_ID,
            status: "SUBMITTED",
            submissionMetadata: { removeMemberId: "OLD_MEMBER_ID" },
          }),
        )
        .mockResolvedValueOnce(replacementTarget);
      getMembershipMock(prismaMock).count.mockResolvedValue(4);

      const result = await confirmSubmittedMembership(prismaMock, {
        membershipId: MEMBERSHIP_ID,
        meetingRecordId: "meeting-001",
        actor: ACTOR,
        maxSeats: MAX_SEATS,
        membershipType: "APPOINTED",
      });

      expect(result).toEqual({ kind: "accepted" });
      expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
        expectMembershipUpdate(
          { status: "REMOVED", removalReason: "OTHER" },
          { id: "membership-target-id-002" },
        ),
      );
    });

    it("throws when audit write fails (OrThrow contract)", async () => {
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ id: MEMBERSHIP_ID, status: "SUBMITTED" }),
      );
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
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({
          id: MEMBERSHIP_ID,
          status: "SUBMITTED",
          rejectionNote: null,
          meetingRecordId: null,
        }),
      );

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

    it("returns notSubmitted when updateMany affects zero rows", async () => {
      getMembershipMock(prismaMock).findUnique.mockResolvedValue(
        createMockMembership({ id: MEMBERSHIP_ID, status: "SUBMITTED" }),
      );
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
