import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import {
  ALREADY_IN_ANOTHER_COMMITTEE_ERROR,
  getGovernanceConfig,
} from "~/app/api/lib/committeeValidation";
import {
  assignNextAvailableSeat,
  ensureSeatsExist,
} from "~/app/api/lib/seatUtils";
import type { Session } from "next-auth";
import { handleCommitteeRequestDataSchema } from "~/lib/validations/committee";
import { logAuditEvent } from "~/lib/auditLog";

function getRemoveMemberIdFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const removeMemberId = (metadata as { removeMemberId?: unknown }).removeMemberId;
  if (typeof removeMemberId !== "string") return null;

  const trimmed = removeMemberId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function handleRequestHandler(req: NextRequest, session: Session) {
  const body = (await req.json()) as unknown;
  const validation = validateRequest(body, handleCommitteeRequestDataSchema);

  if (!validation.success) {
    return validation.response;
  }

  const { membershipId, acceptOrReject } = validation.data;

  try {
    const membership = await prisma.committeeMembership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Committee membership request not found" },
        { status: 404 },
      );
    }

    if (membership.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "This membership is not in a pending (SUBMITTED) state" },
        { status: 400 },
      );
    }

    if (acceptOrReject === "accept") {
      const config = await getGovernanceConfig();

      const outcome = await prisma.$transaction(async (tx) => {
        const submittedMembership = await tx.committeeMembership.findUnique({
          where: { id: membershipId },
        });

        if (!submittedMembership) {
          return { kind: "notFound" } as const;
        }

        if (submittedMembership.status !== "SUBMITTED") {
          return { kind: "notSubmitted" } as const;
        }

        // Lock committee row for atomic capacity+seat assignment (1.R.7).
        await tx.$queryRaw`
          SELECT id
          FROM "CommitteeList"
          WHERE id = ${submittedMembership.committeeListId}
          FOR UPDATE
        `;

        // SRS §7.1: Reject if voter is already ACTIVE in another committee.
        const activeInAnotherCommittee = await tx.committeeMembership.findFirst({
          where: {
            voterRecordId: submittedMembership.voterRecordId,
            committeeListId: { not: submittedMembership.committeeListId },
            termId: submittedMembership.termId,
            status: "ACTIVE",
          },
          select: { id: true },
        });

        if (activeInAnotherCommittee) {
          return { kind: "anotherCommittee" } as const;
        }

        // Capacity check.
        const activeCount = await tx.committeeMembership.count({
          where: {
            committeeListId: submittedMembership.committeeListId,
            termId: submittedMembership.termId,
            status: "ACTIVE",
          },
        });

        if (activeCount >= config.maxSeatsPerLted) {
          await tx.committeeMembership.update({
            where: { id: membershipId },
            data: {
              status: "REJECTED",
              rejectedAt: new Date(),
              rejectionNote: "Committee already full",
            },
          });
          await logAuditEvent(
            session.user.id,
            session.user.privilegeLevel,
            "MEMBER_REJECTED",
            "CommitteeMembership",
            membershipId,
            { status: "SUBMITTED" },
            { status: "REJECTED", rejectionNote: "Committee already full" },
            { reason: "capacity" },
            tx,
          );

          return { kind: "atCapacity" } as const;
        }

        await ensureSeatsExist(
          submittedMembership.committeeListId,
          submittedMembership.termId,
          {
            tx,
            maxSeats: config.maxSeatsPerLted,
          },
        );

        const removeMemberId = getRemoveMemberIdFromMetadata(
          submittedMembership.submissionMetadata,
        );

        if (removeMemberId) {
          const replacementTarget = await tx.committeeMembership.findUnique({
            where: {
              voterRecordId_committeeListId_termId: {
                voterRecordId: removeMemberId,
                committeeListId: submittedMembership.committeeListId,
                termId: submittedMembership.termId,
              },
            },
          });

          if (!replacementTarget || replacementTarget.status !== "ACTIVE") {
            return { kind: "replacementTargetInvalid" } as const;
          }

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
          await logAuditEvent(
            session.user.id,
            session.user.privilegeLevel,
            "MEMBER_REMOVED",
            "CommitteeMembership",
            replacementTarget.id,
            { status: "ACTIVE" },
            { status: "REMOVED", removalReason: "OTHER" },
            {
              reason: "replacement",
              replacementMembershipId: submittedMembership.id,
            },
            tx,
          );
        }

        const seatNumber = await assignNextAvailableSeat(
          submittedMembership.committeeListId,
          submittedMembership.termId,
          {
            tx,
            maxSeats: config.maxSeatsPerLted,
          },
        );

        // Transition SUBMITTED → ACTIVE; leader submissions are vacancy fills (APPOINTED)
        await tx.committeeMembership.update({
          where: { id: membershipId },
          data: {
            status: "ACTIVE",
            activatedAt: new Date(),
            membershipType: "APPOINTED",
            seatNumber,
          },
        });
        await logAuditEvent(
          session.user.id,
          session.user.privilegeLevel,
          "MEMBER_ACTIVATED",
          "CommitteeMembership",
          membershipId,
          { status: "SUBMITTED" },
          { status: "ACTIVE", membershipType: "APPOINTED" },
          undefined,
          tx,
        );

        return { kind: "accepted" } as const;
      });

      if (outcome.kind === "notFound") {
        return NextResponse.json(
          { error: "Committee membership request not found" },
          { status: 404 },
        );
      }

      if (outcome.kind === "notSubmitted") {
        return NextResponse.json(
          { error: "This membership is not in a pending (SUBMITTED) state" },
          { status: 400 },
        );
      }

      if (outcome.kind === "anotherCommittee") {
        return NextResponse.json(
          { error: ALREADY_IN_ANOTHER_COMMITTEE_ERROR },
          { status: 400 },
        );
      }

      if (outcome.kind === "replacementTargetInvalid") {
        return NextResponse.json(
          { error: "Replacement target not found or no longer active" },
          { status: 422 },
        );
      }

      if (outcome.kind === "atCapacity") {
        return NextResponse.json(
          { error: "Committee already at capacity" },
          { status: 400 },
        );
      }
    } else if (acceptOrReject === "reject") {
      // Transition SUBMITTED → REJECTED (conditional to avoid overwriting concurrent accept)
      const updateResult = await prisma.$transaction(async (tx) => {
        const updated = await tx.committeeMembership.updateMany({
          where: { id: membershipId, status: "SUBMITTED" },
          data: {
            status: "REJECTED",
            rejectedAt: new Date(),
          },
        });
        if (updated.count > 0) {
          await logAuditEvent(
            session.user.id,
            session.user.privilegeLevel,
            "MEMBER_REJECTED",
            "CommitteeMembership",
            membershipId,
            { status: "SUBMITTED" },
            { status: "REJECTED" },
            undefined,
            tx,
          );
        }
        return updated.count;
      });
      if (updateResult === 0) {
        return NextResponse.json(
          { error: "This membership is not in a pending (SUBMITTED) state" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { message: `Request ${acceptOrReject}ed` },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, handleRequestHandler);
