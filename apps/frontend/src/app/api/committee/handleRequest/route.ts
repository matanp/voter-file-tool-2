import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { type Prisma, PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { getGovernanceConfig } from "~/app/api/lib/committeeValidation";
import {
  assignNextAvailableSeat,
  ensureSeatsExist,
} from "~/app/api/lib/seatUtils";
import type { Session } from "next-auth";
import { handleCommitteeRequestDataSchema } from "~/lib/validations/committee";
import { logAuditEvent } from "~/lib/auditLog";
import { validateEligibility } from "~/lib/eligibility";

function getRemoveMemberIdFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const removeMemberId = (metadata as { removeMemberId?: unknown })
    .removeMemberId;
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

  const {
    membershipId,
    acceptOrReject,
    meetingRecordId,
    forceAdd,
    overrideReason,
  } =
    validation.data;

  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;
  if (!user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  const isAdmin = user.privilegeLevel === PrivilegeLevel.Admin;
  const eligibilityOptions =
    isAdmin && forceAdd && acceptOrReject === "accept"
      ? { forceAdd: true, overrideReason: overrideReason ?? "" }
      : undefined;

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
      if (!meetingRecordId) {
        return NextResponse.json(
          { error: "meetingRecordId is required when accepting a request" },
          { status: 422 },
        );
      }

      const meetingRecord = await prisma.meetingRecord.findUnique({
        where: { id: meetingRecordId },
        select: { id: true },
      });

      if (!meetingRecord) {
        return NextResponse.json(
          { error: "Invalid meetingRecordId" },
          { status: 422 },
        );
      }

      const eligibility = await validateEligibility(
        membership.voterRecordId,
        membership.committeeListId,
        membership.termId,
        eligibilityOptions,
      );

      if (eligibility.validationError) {
        return NextResponse.json(
          { error: eligibility.validationError },
          { status: 422 },
        );
      }

      if (!eligibility.eligible) {
        return NextResponse.json(
          { error: "INELIGIBLE", reasons: eligibility.hardStops },
          { status: 422 },
        );
      }

      const config = await getGovernanceConfig();
      const eligibilityWarnings = eligibility.warnings;
      const auditMetadata =
        eligibility.bypassedReasons?.length &&
        eligibilityOptions?.overrideReason
          ? {
              bypassedReasons: eligibility.bypassedReasons,
              overrideReason: eligibilityOptions.overrideReason,
            }
          : undefined;
      const auditMetadataWithWarnings =
        eligibilityWarnings.length > 0
          ? { ...auditMetadata, eligibilityWarnings }
          : auditMetadata;
      const auditMetadataWithMeeting = {
        ...(auditMetadataWithWarnings ?? {}),
        meetingRecordId,
      };

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
        const activeInAnotherCommittee = await tx.committeeMembership.findFirst(
          {
            where: {
              voterRecordId: submittedMembership.voterRecordId,
              committeeListId: { not: submittedMembership.committeeListId },
              termId: submittedMembership.termId,
              status: "ACTIVE",
            },
            select: { id: true },
          },
        );

        if (activeInAnotherCommittee) {
          return { kind: "anotherCommittee" } as const;
        }

        // Extract removeMemberId before capacity check so replacements
        // can account for the freed seat (1.R.14).
        const removeMemberId = getRemoveMemberIdFromMetadata(
          submittedMembership.submissionMetadata,
        );

        // Validate replacement target early so we can adjust the capacity check.
        let replacementTarget: Awaited<
          ReturnType<typeof tx.committeeMembership.findUnique>
        > = null;
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
            return { kind: "replacementTargetInvalid" } as const;
          }

          // Guard: replacement target must not be the incoming membership itself.
          if (replacementTarget.id === submittedMembership.id) {
            return { kind: "replacementTargetInvalid" } as const;
          }
        }

        // Capacity check — subtract 1 when a valid replacement frees a seat.
        const activeCount = await tx.committeeMembership.count({
          where: {
            committeeListId: submittedMembership.committeeListId,
            termId: submittedMembership.termId,
            status: "ACTIVE",
          },
        });

        const effectiveActiveCount = activeCount - (replacementTarget ? 1 : 0);

        if (effectiveActiveCount >= config.maxSeatsPerLted) {
          await tx.committeeMembership.update({
            where: { id: membershipId },
            data: {
              status: "REJECTED",
              rejectedAt: new Date(),
              rejectionNote: "Committee already full",
            },
          });
          await logAuditEvent(
            userId,
            user.privilegeLevel,
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

        // Remove the replacement target (already validated above).
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
          await logAuditEvent(
            userId,
            user.privilegeLevel,
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

        const now = new Date();

        // Transition SUBMITTED → ACTIVE (meeting-linked approval path); leader submissions are vacancy fills (APPOINTED)
        // SRS §2.2 — Persist eligibility warning snapshot at accept time
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
            membershipType: "APPOINTED",
            seatNumber,
            submissionMetadata:
              Object.keys(updatedSubmissionMetadata).length > 0
                ? (updatedSubmissionMetadata as Prisma.InputJsonValue)
                : undefined,
          },
        });
        const confirmedSnapshot = {
          status: "CONFIRMED",
          membershipType: "APPOINTED",
          seatNumber,
          confirmedAt: now.toISOString(),
          activatedAt: now.toISOString(),
          meetingRecordId,
        };
        const activatedSnapshot = {
          status: "ACTIVE",
          membershipType: "APPOINTED",
          seatNumber,
          confirmedAt: now.toISOString(),
          activatedAt: now.toISOString(),
          meetingRecordId,
        };

        await logAuditEvent(
          userId,
          user.privilegeLevel,
          "MEMBER_CONFIRMED",
          "CommitteeMembership",
          membershipId,
          { status: "SUBMITTED" },
          confirmedSnapshot,
          auditMetadataWithMeeting,
          tx,
        );

        await logAuditEvent(
          userId,
          user.privilegeLevel,
          "MEMBER_ACTIVATED",
          "CommitteeMembership",
          membershipId,
          { status: "CONFIRMED" },
          activatedSnapshot,
          auditMetadataWithMeeting,
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
          { error: "INELIGIBLE", reasons: ["ALREADY_IN_ANOTHER_COMMITTEE"] },
          { status: 422 },
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
          { error: "INELIGIBLE", reasons: ["CAPACITY"] },
          { status: 422 },
        );
      }
      return NextResponse.json(
        {
          message: "Request accepted",
          ...(eligibilityWarnings.length > 0
            ? { warnings: eligibilityWarnings }
            : {}),
        },
        { status: 200 },
      );
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
            userId,
            user.privilegeLevel,
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
