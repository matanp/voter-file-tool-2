import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import {
  ALREADY_IN_ANOTHER_COMMITTEE_ERROR,
  getGovernanceConfig,
  isVoterActiveInAnotherCommittee,
  countActiveMembers,
} from "~/app/api/lib/committeeValidation";
import {
  assignNextAvailableSeat,
  ensureSeatsExist,
} from "~/app/api/lib/seatUtils";
import type { Session } from "next-auth";
import { handleCommitteeRequestDataSchema } from "~/lib/validations/committee";
import { logAuditEvent } from "~/lib/auditLog";

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
      // SRS §7.1: Reject if voter is already ACTIVE in another committee
      if (
        await isVoterActiveInAnotherCommittee(
          membership.voterRecordId,
          membership.committeeListId,
          membership.termId,
        )
      ) {
        return NextResponse.json(
          { success: false, error: ALREADY_IN_ANOTHER_COMMITTEE_ERROR },
          { status: 400 },
        );
      }

      // Capacity check
      const config = await getGovernanceConfig();
      const activeCount = await countActiveMembers(
        membership.committeeListId,
        membership.termId,
      );

      if (activeCount >= config.maxSeatsPerLted) {
        // Reject the request due to capacity — mark as rejected
        await prisma.committeeMembership.update({
          where: { id: membershipId },
          data: {
            status: "REJECTED",
            rejectedAt: new Date(),
            rejectionNote: "Committee already full",
          },
        });
        await logAuditEvent(
          session.user.id,
          session.user.privilegeLevel as PrivilegeLevel,
          "MEMBER_REJECTED",
          "CommitteeMembership",
          membershipId,
          { status: "SUBMITTED" },
          { status: "REJECTED", rejectionNote: "Committee already full" },
          { reason: "capacity" },
        );
        return NextResponse.json(
          { success: false, error: "Committee already at capacity" },
          { status: 400 },
        );
      }

      await ensureSeatsExist(membership.committeeListId, membership.termId);
      const seatNumber = await assignNextAvailableSeat(
        membership.committeeListId,
        membership.termId,
      );

      // Transition SUBMITTED → ACTIVE; leader submissions are vacancy fills (APPOINTED)
      await prisma.committeeMembership.update({
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
        session.user.privilegeLevel as PrivilegeLevel,
        "MEMBER_ACTIVATED",
        "CommitteeMembership",
        membershipId,
        { status: "SUBMITTED" },
        { status: "ACTIVE", membershipType: "APPOINTED" },
      );
    } else if (acceptOrReject === "reject") {
      // Transition SUBMITTED → REJECTED
      await prisma.committeeMembership.update({
        where: { id: membershipId },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
        },
      });
      await logAuditEvent(
        session.user.id,
        session.user.privilegeLevel as PrivilegeLevel,
        "MEMBER_REJECTED",
        "CommitteeMembership",
        membershipId,
        { status: "SUBMITTED" },
        { status: "REJECTED" },
      );
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
