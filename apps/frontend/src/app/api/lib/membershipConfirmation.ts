/**
 * SUBMITTED → ACTIVE / REJECTED membership transitions for appointment paths.
 * Shared by handleRequest and meetings/decisions bulk confirm.
 *
 * A replacement is a Submission paired with an Exit Report on the member being
 * replaced: the outgoing ACTIVE row's `replacementMembershipId` points at the
 * candidate (ticket 09). Accepting the candidate records the outgoing member's
 * exit as reported, in the same transaction; rejecting it rejects the paired
 * report too, as the Admin's reject of a report would.
 */

import {
  type MembershipType,
  type Prisma,
  type PrivilegeLevel,
} from "@prisma/client";
import {
  ACTIVE_MEMBERSHIP_STATUS,
  countActiveMembers,
  isVoterActiveInAnotherCommittee,
} from "~/app/api/lib/committeeValidation";
import {
  assignNextAvailableSeat,
  ensureSeatsExist,
} from "~/app/api/lib/seatUtils";
import {
  clearRejectedExitReport,
  reportedExit,
  writeMembershipExit,
} from "~/app/api/lib/membershipExit";
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
  /** The paired report lacks what its exit needs; reject it, or the candidate. */
  | { kind: "replacementExitIncomplete"; message: string }
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

/**
 * Rejects the Exit Report paired with `candidateId`, if any: clears the report,
 * its exit fields and the pairing (the Admin's reject rule), leaving the
 * outgoing member ACTIVE. Audited as `MEMBER_EXIT_REPORT_REJECTED` with
 * `reason: "replacement_rejected"`.
 */
async function rejectPairedExitReport(
  tx: Prisma.TransactionClient,
  candidateId: string,
  actor: ConfirmMembershipActor,
  auditMetadata: Record<string, unknown> | undefined,
): Promise<void> {
  const outgoing = await tx.committeeMembership.findUnique({
    where: { replacementMembershipId: candidateId },
  });
  if (!outgoing?.exitReportedAt) return;
  const reportedAt = outgoing.exitReportedAt;
  if (!(await clearRejectedExitReport(tx, outgoing.id, reportedAt))) return;

  await logAuditEventOrThrow(
    actor.userId,
    actor.userRole,
    "MEMBER_EXIT_REPORT_REJECTED",
    "CommitteeMembership",
    outgoing.id,
    {
      status: ACTIVE_MEMBERSHIP_STATUS,
      exitReportedAt: reportedAt.toISOString(),
      exitReportedKind: outgoing.exitReportedKind,
      removalReason: outgoing.removalReason,
      replacementMembershipId: candidateId,
    },
    { status: ACTIVE_MEMBERSHIP_STATUS },
    mergeAuditMetadata(
      {
        ...auditMetadata,
        reason: "replacement_rejected",
        replacementMembershipId: candidateId,
        reportedById: outgoing.exitReportedById,
        reportedAt: reportedAt.toISOString(),
      },
      await fetchMembershipAuditSubject(tx, {
        voterRecordId: outgoing.voterRecordId,
        committeeListId: outgoing.committeeListId,
        termId: outgoing.termId,
        seatNumber: outgoing.seatNumber,
      }),
    ),
    tx,
  );
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

  // The CHECK constraint keeps a pairing only on an ACTIVE row with a pending
  // report, so a row found here is the outgoing member as reported.
  const replacementTarget = await tx.committeeMembership.findUnique({
    where: { replacementMembershipId: submittedMembership.id },
  });
  let replacementExit: ReturnType<typeof reportedExit> | null = null;
  if (replacementTarget) {
    if (
      replacementTarget.status !== ACTIVE_MEMBERSHIP_STATUS ||
      replacementTarget.exitReportedAt === null
    ) {
      return { kind: "replacementTargetInvalid" };
    }
    replacementExit = reportedExit(replacementTarget);
    if (replacementExit.kind === "incomplete") {
      return {
        kind: "replacementExitIncomplete",
        message: replacementExit.message,
      };
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
    await rejectPairedExitReport(tx, membershipId, actor, { reason: "capacity" });

    return { kind: "atCapacity" };
  }

  await ensureSeatsExist(
    submittedMembership.committeeListId,
    submittedMembership.termId,
    { tx, maxSeats },
  );

  if (replacementTarget?.exitReportedAt && replacementExit?.kind === "ok") {
    const reportedAt = replacementTarget.exitReportedAt;
    const { exit, afterValue } = replacementExit;
    // Exactly the report the pairing was read with: a report rejected or
    // rewritten since is refused, like the Admin's confirm.
    const exitResult = await writeMembershipExit(
      tx,
      replacementTarget,
      { ...exit, extra: { seatNumber: null } },
      { expectedExitReportedAt: reportedAt },
    );
    if (exitResult.kind !== "written") {
      return { kind: "replacementTargetInvalid" };
    }
    await logAuditEventOrThrow(
      userId,
      userRole,
      exit.status === "RESIGNED" ? "MEMBER_RESIGNED" : "MEMBER_REMOVED",
      "CommitteeMembership",
      replacementTarget.id,
      {
        status: ACTIVE_MEMBERSHIP_STATUS,
        ...(replacementTarget.seatNumber != null
          ? { seatNumber: replacementTarget.seatNumber }
          : {}),
      },
      afterValue,
      mergeAuditMetadata(
        {
          reason: "replacement",
          replacementMembershipId: submittedMembership.id,
          reportedById: replacementTarget.exitReportedById,
          reportedAt: reportedAt.toISOString(),
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
      status: ACTIVE_MEMBERSHIP_STATUS,
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
    status: ACTIVE_MEMBERSHIP_STATUS,
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

  await rejectPairedExitReport(tx, membershipId, actor, auditMetadata);

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
