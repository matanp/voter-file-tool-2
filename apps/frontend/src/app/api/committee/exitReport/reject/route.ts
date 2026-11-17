/**
 * POST /api/committee/exitReport/reject — an Admin rejects a Leader's pending
 * Exit Report. Clears the report and the four exit fields; the member stays
 * ACTIVE. The rejection lives only in the audit log
 * (`MEMBER_EXIT_REPORT_REJECTED`).
 *
 * The body echoes the `exitReportedAt` the Admin saw; a row whose report has
 * since changed (confirmed, rejected, re-filed, or the member left) is a 409.
 */

import { type NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { PrivilegeLevel } from "@prisma/client";
import prisma from "~/lib/prisma";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { ACTIVE_MEMBERSHIP_STATUS } from "~/app/api/lib/committeeValidation";
import { MEMBER_CHANGED_MESSAGE } from "~/app/api/lib/exitReportAccess";
import { clearRejectedExitReport } from "~/app/api/lib/membershipExit";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import {
  buildMembershipAuditSubject,
  mergeAuditMetadata,
} from "~/lib/auditMembershipSubject";
import { rejectExitReportSchema } from "~/lib/validations/committee";

async function rejectExitReportHandler(
  req: NextRequest,
  session: SessionWithUser,
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON format" },
      { status: 400 },
    );
  }

  const validation = validateRequest(body, rejectExitReportSchema);
  if (!validation.success) return validation.response;

  const { membershipId, exitReportedAt, note } = validation.data;
  const expectedAt = new Date(exitReportedAt);
  const userId = session.user.id;
  const userRole = session.user.privilegeLevel;

  try {
    const membership = await prisma.committeeMembership.findUnique({
      where: { id: membershipId },
      include: {
        voterRecord: {
          select: {
            VRCNUM: true,
            firstName: true,
            middleInitial: true,
            lastName: true,
          },
        },
        committeeList: true,
        term: { select: { id: true, label: true } },
      },
    });
    if (!membership) {
      return NextResponse.json(
        { success: false, error: "Membership not found" },
        { status: 404 },
      );
    }
    // The audit's before-values come from this read, so it must be the report
    // the Admin saw; the conditional update below re-checks it at write time.
    if (membership.exitReportedAt?.getTime() !== expectedAt.getTime()) {
      return NextResponse.json(
        { success: false, error: MEMBER_CHANGED_MESSAGE },
        { status: 409 },
      );
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const cleared = await clearRejectedExitReport(tx, membershipId, expectedAt);
      if (!cleared) return "changed" as const;

      await logAuditEventOrThrow(
        userId,
        userRole,
        "MEMBER_EXIT_REPORT_REJECTED",
        "CommitteeMembership",
        membershipId,
        {
          status: ACTIVE_MEMBERSHIP_STATUS,
          exitReportedAt,
          exitReportedKind: membership.exitReportedKind,
          removalReason: membership.removalReason,
        },
        { status: ACTIVE_MEMBERSHIP_STATUS },
        mergeAuditMetadata(
          {
            reportedById: membership.exitReportedById,
            reportedAt: exitReportedAt,
            ...(note ? { rejectionNote: note } : {}),
          },
          buildMembershipAuditSubject({
            voterRecord: membership.voterRecord,
            committee: membership.committeeList,
            term: membership.term,
            seatNumber: membership.seatNumber,
          }),
        ),
        tx,
      );
      return "rejected" as const;
    });

    if (outcome === "changed") {
      return NextResponse.json(
        { success: false, error: MEMBER_CHANGED_MESSAGE },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: "rejectExitReport" },
      extra: { membershipId },
    });
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, rejectExitReportHandler);
