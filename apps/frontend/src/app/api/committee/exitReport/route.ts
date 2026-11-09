/**
 * POST /api/committee/exitReport — a Leader (RequestAccess and above) reports
 * that an ACTIVE member resigned or should be removed. The member stays ACTIVE
 * and seated until an Admin confirms it as reported
 * (`/api/committee/exitReport/confirm`) or rejects it
 * (`/api/committee/exitReport/reject`).
 *
 * Refuses: committees outside a Leader's jurisdictions (403), members who
 * aren't ACTIVE (400), and members who already have a pending report (409,
 * via a conditional update so two concurrent reports can't both land).
 */

import { type NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { PrivilegeLevel } from "@prisma/client";
import { toDbSentinelValue } from "@voter-file-tool/shared-validators";
import prisma from "~/lib/prisma";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import {
  ACTIVE_MEMBERSHIP_STATUS,
  getActiveTermId,
} from "~/app/api/lib/committeeValidation";
import { leaderMayActOnCommittee } from "~/app/api/lib/exitReportAccess";
import { fileExitReport } from "~/app/api/lib/membershipExit";
import {
  exitReportedAuditValue,
  toExitReportInput,
} from "~/app/api/lib/exitReportInput";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import {
  buildMembershipAuditSubject,
  mergeAuditMetadata,
} from "~/lib/auditMembershipSubject";
import { reportExitDataSchema } from "~/lib/validations/committee";

async function reportExitHandler(req: NextRequest, session: SessionWithUser) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON format" },
      { status: 400 },
    );
  }

  const validation = validateRequest(body, reportExitDataSchema);
  if (!validation.success) return validation.response;

  const { cityTown, legDistrict, electionDistrict, memberId, ...fields } =
    validation.data;
  const userId = session.user.id;
  const userRole = session.user.privilegeLevel;

  try {
    const activeTermId = await getActiveTermId();

    const committee = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict_termId: {
          cityTown,
          legDistrict: toDbSentinelValue(legDistrict),
          electionDistrict,
          termId: activeTermId,
        },
      },
      include: { term: { select: { id: true, label: true } } },
    });
    if (!committee) {
      return NextResponse.json(
        { success: false, error: "Committee not found in the active term" },
        { status: 404 },
      );
    }

    const allowed = await leaderMayActOnCommittee({
      userId,
      privilegeLevel: userRole,
      termId: activeTermId,
      committee,
    });
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have jurisdiction access for this committee",
        },
        { status: 403 },
      );
    }

    const membership = await prisma.committeeMembership.findUnique({
      where: {
        voterRecordId_committeeListId_termId: {
          voterRecordId: memberId,
          committeeListId: committee.id,
          termId: activeTermId,
        },
      },
      include: {
        voterRecord: {
          select: {
            VRCNUM: true,
            firstName: true,
            middleInitial: true,
            lastName: true,
          },
        },
      },
    });
    if (!membership) {
      return NextResponse.json(
        { success: false, error: "Member not found in this committee" },
        { status: 404 },
      );
    }
    if (membership.status !== ACTIVE_MEMBERSHIP_STATUS) {
      return NextResponse.json(
        {
          success: false,
          error: "Member does not have an active membership in this committee",
        },
        { status: 400 },
      );
    }
    if (membership.exitReportedAt !== null) {
      return NextResponse.json(
        {
          success: false,
          error: "An exit has already been reported for this member",
        },
        { status: 409 },
      );
    }

    const reported = toExitReportInput(fields, userId);

    const reportedAt = await prisma.$transaction(async (tx) => {
      const at = await fileExitReport(tx, membership.id, reported);
      if (at === null) return null;

      await logAuditEventOrThrow(
        userId,
        userRole,
        "MEMBER_EXIT_REPORTED",
        "CommitteeMembership",
        membership.id,
        { status: ACTIVE_MEMBERSHIP_STATUS },
        exitReportedAuditValue(at, reported),
        mergeAuditMetadata(
          undefined,
          buildMembershipAuditSubject({
            voterRecord: membership.voterRecord,
            committee,
            term: committee.term,
            seatNumber: membership.seatNumber,
          }),
        ),
        tx,
      );
      return at;
    });

    if (reportedAt === null) {
      // Lost a race: another report landed, or the member left, since the read.
      return NextResponse.json(
        {
          success: false,
          error:
            "This member changed, refresh. An exit may already have been reported.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: true, exitReportedAt: reportedAt.toISOString() },
      { status: 201 },
    );
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: "reportExit" },
      extra: { cityTown, legDistrict, electionDistrict, memberId },
    });
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.RequestAccess,
  reportExitHandler,
);
