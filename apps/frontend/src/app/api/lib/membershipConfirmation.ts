/**
 * SUBMITTED → ACTIVE / REJECTED membership transitions for appointment paths.
 * Shared by handleRequest and meetings/decisions bulk confirm.
 */

import {
  type CommitteeMembership,
  type MembershipType,
  type Prisma,
  type PrivilegeLevel,
} from "@prisma/client";
import {
  countActiveMembers,
  isVoterActiveInAnotherCommittee,
} from "~/app/api/lib/committeeValidation";
import {
  assignNextAvailableSeat,
  ensureSeatsExist,
} from "~/app/api/lib/seatUtils";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import {
  fetchMembershipAuditSubject,
  mergeAuditMetadata,
} from "~/lib/auditMembershipSubject";
import type { EligibilityWarning } from "~/lib/eligibility";

export type ConfirmMembershipActor = {
  userId: string;
  userRole: PrivilegeLevel;
};

export type ConfirmSubmittedMembershipParams = {
  membershipId: string;
  meetingRecordId: string;
  actor: ConfirmMembershipActor;
  maxSeats: number;
  membershipType: MembershipType;
  eligibilityWarnings?: EligibilityWarning[];
  auditMetadata?: Record<string, unknown>;
};

export type ConfirmSubmittedMembershipResult =
  | { kind: "accepted" }
  | { kind: "notFound" }
  | { kind: "notSubmitted" }
  | { kind: "anotherCommittee" }
  | { kind: "replacementTargetInvalid" }
  | { kind: "atCapacity" };

export type RejectSubmittedMembershipParams = {
  membershipId: string;
  actor: ConfirmMembershipActor;
  meetingRecordId?: string;
  rejectionNote?: string | null;
  auditMetadata?: Record<string, unknown>;
};

export type RejectSubmittedMembershipResult =
  | { kind: "rejected" }
  | { kind: "notSubmitted" }
  | { kind: "notFound" };

/** Reads removeMemberId from submissionMetadata JSON. */
export function getRemoveMemberIdFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const removeMemberId = (metadata as { removeMemberId?: unknown })
    .removeMemberId;
  if (typeof removeMemberId !== "string") return null;

  const trimmed = removeMemberId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Confirms a SUBMITTED membership: lock, capacity, seat assign, ACTIVE update, audit pair. */
export async function confirmSubmittedMembership(
  tx: Prisma.TransactionClient,
  params: ConfirmSubmittedMembershipParams,
): Promise<ConfirmSubmittedMembershipResult> {
  const {
    membershipId,
    meetingRecordId,
    actor,
    maxSeats,
    membershipType,
    eligibilityWarnings = [],
    auditMetadata,
  } = params;
  const { userId, userRole } = actor;

  const submittedMembership = await tx.committeeMembership.findUnique({
    where: { id: membershipId },
  });

  if (!submittedMembership) {
    return { kind: "notFound" };
  }

  if (submittedMembership.status !== "SUBMITTED") {
    return { kind: "notSubmitted" };
  }

  // Lock committee row for atomic capacity+seat assignment (1.R.7).
  await tx.$queryRaw`
    SELECT id
    FROM "CommitteeList"
    WHERE id = ${submittedMembership.committeeListId}
    FOR UPDATE
  `;

  // SRS §7.1: Reject if voter is already ACTIVE in another committee.
  if (
    await isVoterActiveInAnotherCommittee(
      submittedMembership.voterRecordId,
      submittedMembership.committeeListId,
      submittedMembership.termId,
      tx,
    )
  ) {
    return { kind: "anotherCommittee" };
  }

  const removeMemberId = getRemoveMemberIdFromMetadata(
    submittedMembership.submissionMetadata,
  );

  let replacementTarget: CommitteeMembership | null = null;
  if (removeMemberId) {
    replacementTarget = await tx.committeeMembership.findUnique({
      where: {
        voterRecordId_committeeListId_termId: {
          voterRecordId: removeMemberId,
          committeeListId: submittedMembership.committeeListId,
          termId: submittedMembership.termId,
        },
      },
    });

    if (!replacementTarget || replacementTarget.status !== "ACTIVE") {
      return { kind: "replacementTargetInvalid" };
    }

    if (replacementTarget.id === submittedMembership.id) {
      return { kind: "replacementTargetInvalid" };
    }
  }

  const activeCount = await countActiveMembers(
    submittedMembership.committeeListId,
    submittedMembership.termId,
    tx,
  );

  const effectiveActiveCount = activeCount - (replacementTarget ? 1 : 0);

  if (effectiveActiveCount >= maxSeats) {
    const capacityRejectSubject = await fetchMembershipAuditSubject(tx, {
      voterRecordId: submittedMembership.voterRecordId,
      committeeListId: submittedMembership.committeeListId,
      termId: submittedMembership.termId,
    });
    await tx.committeeMembership.update({
      where: { id: membershipId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionNote: "Committee already full",
      },
    });
    await logAuditEventOrThrow(
      userId,
      userRole,
      "MEMBER_REJECTED",
      "CommitteeMembership",
      membershipId,
      { status: "SUBMITTED" },
      { status: "REJECTED", rejectionNote: "Committee already full" },
      mergeAuditMetadata({ reason: "capacity" }, capacityRejectSubject),
      tx,
    );

    return { kind: "atCapacity" };
  }

  await ensureSeatsExist(
    submittedMembership.committeeListId,
    submittedMembership.termId,
    { tx, maxSeats },
  );

  if (replacementTarget) {
    await tx.committeeMembership.update({
      where: { id: replacementTarget.id },
      data: {
        status: "REMOVED",
        removedAt: new Date(),
        removalReason: "OTHER",
        removalNotes: "Replacement request accepted",
        seatNumber: null,
      },
    });
    await logAuditEventOrThrow(
      userId,
      userRole,
      "MEMBER_REMOVED",
      "CommitteeMembership",
      replacementTarget.id,
      { status: "ACTIVE" },
      { status: "REMOVED", removalReason: "OTHER" },
      mergeAuditMetadata(
        {
          reason: "replacement",
          replacementMembershipId: submittedMembership.id,
        },
        await fetchMembershipAuditSubject(tx, {
          voterRecordId: replacementTarget.voterRecordId,
          committeeListId: replacementTarget.committeeListId,
          termId: replacementTarget.termId,
          seatNumber: replacementTarget.seatNumber,
        }),
      ),
      tx,
    );
  }

  const seatNumber = await assignNextAvailableSeat(
    submittedMembership.committeeListId,
    submittedMembership.termId,
    { tx, maxSeats },
  );

  const now = new Date();

  const existingMeta =
    submittedMembership.submissionMetadata &&
    typeof submittedMembership.submissionMetadata === "object" &&
    !Array.isArray(submittedMembership.submissionMetadata)
      ? (submittedMembership.submissionMetadata as Record<string, unknown>)
      : {};
  const updatedSubmissionMetadata =
    eligibilityWarnings.length > 0
      ? { ...existingMeta, eligibilityWarnings }
      : existingMeta;

  await tx.committeeMembership.update({
    where: { id: membershipId },
    data: {
      status: "ACTIVE",
      confirmedAt: now,
      activatedAt: now,
      meetingRecordId,
      membershipType,
      seatNumber,
      submissionMetadata:
        Object.keys(updatedSubmissionMetadata).length > 0
          ? (updatedSubmissionMetadata as Prisma.InputJsonValue)
          : undefined,
    },
  });

  const confirmedSnapshot = {
    status: "CONFIRMED" as const,
    membershipType,
    seatNumber,
    confirmedAt: now.toISOString(),
    activatedAt: now.toISOString(),
    meetingRecordId,
  };
  const activatedSnapshot = {
    status: "ACTIVE" as const,
    membershipType,
    seatNumber,
    confirmedAt: now.toISOString(),
    activatedAt: now.toISOString(),
    meetingRecordId,
  };

  const acceptedSubject = await fetchMembershipAuditSubject(tx, {
    voterRecordId: submittedMembership.voterRecordId,
    committeeListId: submittedMembership.committeeListId,
    termId: submittedMembership.termId,
    seatNumber,
  });
  const auditMetadataWithSubject = mergeAuditMetadata(
    auditMetadata,
    acceptedSubject,
  );

  await logAuditEventOrThrow(
    userId,
    userRole,
    "MEMBER_CONFIRMED",
    "CommitteeMembership",
    membershipId,
    { status: "SUBMITTED" },
    confirmedSnapshot,
    auditMetadataWithSubject,
    tx,
  );

  await logAuditEventOrThrow(
    userId,
    userRole,
    "MEMBER_ACTIVATED",
    "CommitteeMembership",
    membershipId,
    { status: "CONFIRMED" },
    activatedSnapshot,
    auditMetadataWithSubject,
    tx,
  );

  return { kind: "accepted" };
}

/** Rejects a SUBMITTED membership with race-safe conditional update. */
export async function rejectSubmittedMembership(
  tx: Prisma.TransactionClient,
  params: RejectSubmittedMembershipParams,
): Promise<RejectSubmittedMembershipResult> {
  const {
    membershipId,
    actor,
    meetingRecordId,
    rejectionNote,
    auditMetadata,
  } = params;
  const { userId, userRole } = actor;

  const membership = await tx.committeeMembership.findUnique({
    where: { id: membershipId },
  });

  if (!membership) {
    return { kind: "notFound" };
  }

  const beforeSnapshot = {
    status: "SUBMITTED" as const,
    rejectedAt: membership.rejectedAt,
    rejectionNote: membership.rejectionNote,
    meetingRecordId: membership.meetingRecordId,
  };

  const updated = await tx.committeeMembership.updateMany({
    where: { id: membershipId, status: "SUBMITTED" },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      ...(meetingRecordId !== undefined ? { meetingRecordId } : {}),
      ...(rejectionNote !== undefined ? { rejectionNote } : {}),
    },
  });

  if (updated.count === 0) {
    return { kind: "notSubmitted" };
  }

  const now = new Date();
  const rejectSubject = await fetchMembershipAuditSubject(tx, {
    voterRecordId: membership.voterRecordId,
    committeeListId: membership.committeeListId,
    termId: membership.termId,
  });

  await logAuditEventOrThrow(
    userId,
    userRole,
    "MEMBER_REJECTED",
    "CommitteeMembership",
    membershipId,
    beforeSnapshot,
    {
      status: "REJECTED",
      rejectedAt: now.toISOString(),
      rejectionNote: rejectionNote ?? null,
      meetingRecordId: meetingRecordId ?? membership.meetingRecordId,
    },
    mergeAuditMetadata(auditMetadata, rejectSubject),
    tx,
  );

  return { kind: "rejected" };
}
