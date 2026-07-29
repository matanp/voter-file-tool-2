import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { getGovernanceConfig, isActiveMembershipPerTermConflict } from "~/app/api/lib/committeeValidation";
import {
  confirmSubmittedMembership,
  rejectSubmittedMembership,
} from "~/app/api/lib/membershipConfirmation";
import type { Session } from "next-auth";
import { handleCommitteeRequestDataSchema } from "~/lib/validations/committee";
import { validateEligibility } from "~/lib/eligibility";

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

    const actor = { userId, userRole: user.privilegeLevel };
    const resolvedMembershipType = membership.membershipType ?? "APPOINTED";

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

      const outcome = await prisma.$transaction(async (tx) =>
        confirmSubmittedMembership(tx, {
          membershipId,
          meetingRecordId,
          actor,
          maxSeats: config.maxSeatsPerLted,
          membershipType: resolvedMembershipType,
          eligibilityWarnings,
          auditMetadata: auditMetadataWithMeeting,
        }),
      );

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
      const outcome = await prisma.$transaction(async (tx) =>
        rejectSubmittedMembership(tx, {
          membershipId,
          actor,
        }),
      );

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
    }

    return NextResponse.json(
      { message: `Request ${acceptOrReject}ed` },
      { status: 200 },
    );
  } catch (error) {
    if (isActiveMembershipPerTermConflict(error)) {
      return NextResponse.json(
        { error: "INELIGIBLE", reasons: ["ALREADY_IN_ANOTHER_COMMITTEE"] },
        { status: 422 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, handleRequestHandler);
