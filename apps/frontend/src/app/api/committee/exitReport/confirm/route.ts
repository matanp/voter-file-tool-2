/**
 * POST /api/committee/exitReport/confirm — an Admin confirms a Leader's
 * pending Exit Report exactly as reported. A resignation becomes RESIGNED with
 * the reported date received, method and notes; a removal becomes REMOVED with
 * the reported reason and notes. The Admin can't edit the report: a wrong one
 * is rejected (`/api/committee/exitReport/reject`) and filed again.
 *
 * The body echoes the `exitReportedAt` the Admin saw; a row whose report has
 * since changed (confirmed, rejected, re-filed, or the member left) is a 409.
 * Audited as `MEMBER_RESIGNED` / `MEMBER_REMOVED` with
 * `{ source: "exit_report", reportedById, reportedAt }`, plus the Admin's
 * optional `confirmationNote` (like a rejection's `rejectionNote`).
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
import {
  writeMembershipExit,
  type MembershipExit,
} from "~/app/api/lib/membershipExit";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import {
  buildMembershipAuditSubject,
  mergeAuditMetadata,
} from "~/lib/auditMembershipSubject";
import { confirmExitReportSchema } from "~/lib/validations/committee";

/** "YYYY-MM-DD", as the Admin's Record resignation audit stores it. */
function calendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function confirmExitReportHandler(
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

  const validation = validateRequest(body, confirmExitReportSchema);
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
    // The exit is built from this read, so it must be the report the Admin
    // saw; the conditional write below re-checks it.
    if (
      membership.status !== ACTIVE_MEMBERSHIP_STATUS ||
      membership.exitReportedAt?.getTime() !== expectedAt.getTime()
    ) {
      return NextResponse.json(
        { success: false, error: MEMBER_CHANGED_MESSAGE },
        { status: 409 },
      );
    }

    const notes = membership.removalNotes;
    let exit: MembershipExit;
    let afterValue: Record<string, unknown>;
    if (membership.exitReportedKind === "RESIGNATION") {
      const { resignationDateReceived, resignationMethod } = membership;
      // Reports filed before both became required may lack them (SRS §6.5).
      if (!resignationDateReceived || !resignationMethod) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This report is missing the date received or the method. Reject it so the Leader can report it again.",
          },
          { status: 422 },
        );
      }
      exit = {
        status: "RESIGNED",
        resignationDateReceived,
        resignationMethod,
        removalReason: null,
        removalNotes: notes,
      };
      afterValue = {
        status: "RESIGNED",
        resignationDateReceived: calendarDate(resignationDateReceived),
        resignationMethod,
        ...(notes ? { removalNotes: notes } : {}),
      };
    } else {
      const { removalReason } = membership;
      if (!removalReason) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This report has no reason. Reject it so the Leader can report it again.",
          },
          { status: 422 },
        );
      }
      exit = {
        status: "REMOVED",
        resignationDateReceived: null,
        resignationMethod: null,
        removalReason,
        removalNotes: notes,
      };
      afterValue = {
        status: "REMOVED",
        removalReason,
        ...(notes ? { removalNotes: notes } : {}),
      };
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const result = await writeMembershipExit(tx, membership, exit, {
        expectedExitReportedAt: expectedAt,
      });
      if (result.kind !== "written") return "changed" as const;

      await logAuditEventOrThrow(
        userId,
        userRole,
        exit.status === "RESIGNED" ? "MEMBER_RESIGNED" : "MEMBER_REMOVED",
        "CommitteeMembership",
        membershipId,
        {
          status: ACTIVE_MEMBERSHIP_STATUS,
          ...(membership.seatNumber != null
            ? { seatNumber: membership.seatNumber }
            : {}),
        },
        afterValue,
        mergeAuditMetadata(
          {
            source: "exit_report",
            reportedById: membership.exitReportedById,
            reportedAt: exitReportedAt,
            ...(note ? { confirmationNote: note } : {}),
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
      return "confirmed" as const;
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
      tags: { operation: "confirmExitReport" },
      extra: { membershipId },
    });
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.Admin,
  confirmExitReportHandler,
);
