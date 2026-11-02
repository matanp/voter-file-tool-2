import { type NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { blankToNull } from "~/lib/blankToNull";
import prisma from "~/lib/prisma";
import {
  removeCommitteeDataSchema,
  resignCommitteeDataSchema,
  type RemoveCommitteeData,
  type ResignCommitteeData,
} from "~/lib/validations/committee";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { toDbSentinelValue } from "@voter-file-tool/shared-validators";
import { ACTIVE_MEMBERSHIP_STATUS, getActiveTermId } from "~/app/api/lib/committeeValidation";
import type { Session } from "next-auth";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import {
  buildMembershipAuditSubject,
  mergeAuditMetadata,
} from "~/lib/auditMembershipSubject";
import {
  supersededExitReportMetadata,
  writeMembershipExit,
  type MembershipExit,
} from "~/app/api/lib/membershipExit";
import { MEMBER_CHANGED_MESSAGE } from "~/app/api/lib/exitReportAccess";

/**
 * SRS 2.3 / 2.5 — Admin records a resignation (`action: "RESIGN"`) or removes a
 * member, through the shared exit helper. A pending Exit Report on the member
 * is superseded (confirming one goes through `/api/committee/exitReport/confirm`).
 */
async function removeCommitteeHandler(req: NextRequest, session: Session) {
  const body = (await req.json()) as unknown;
  const isResign =
    typeof body === "object" &&
    body !== null &&
    (body as { action?: string }).action === "RESIGN";

  const validation = isResign
    ? validateRequest(body, resignCommitteeDataSchema)
    : validateRequest(body, removeCommitteeDataSchema);

  if (!validation.success) {
    return validation.response;
  }

  const { cityTown, legDistrict, electionDistrict, memberId } = validation.data;

  if (!session.user?.id) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  const userId = session.user.id;
  const userRole = session.user.privilegeLevel;
  const legDistrictForDb = toDbSentinelValue(legDistrict);

  try {
    const activeTermId = await getActiveTermId();

    const committee = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict_termId: {
          cityTown,
          legDistrict: legDistrictForDb,
          electionDistrict,
          termId: activeTermId,
        },
      },
      include: { term: { select: { id: true, label: true } } },
    });

    if (!committee) {
      return NextResponse.json(
        { status: "error", error: "Committee not found" },
        { status: 404 },
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
    });

    if (!membership) {
      return NextResponse.json(
        { status: "error", error: "Member not found in this committee" },
        { status: 404 },
      );
    }

    if (membership.status !== ACTIVE_MEMBERSHIP_STATUS) {
      return NextResponse.json(
        {
          status: "error",
          error: "Member does not have an active membership in this committee",
        },
        { status: 400 },
      );
    }

    const voterRecord = await prisma.voterRecord.findUnique({
      where: { VRCNUM: memberId },
      select: {
        VRCNUM: true,
        firstName: true,
        middleInitial: true,
        lastName: true,
      },
    });

    if (!voterRecord) {
      return NextResponse.json(
        { status: "error", error: "Member not found" },
        { status: 404 },
      );
    }

    const membershipSubject = buildMembershipAuditSubject({
      voterRecord,
      committee,
      term: committee.term,
      seatNumber: membership.seatNumber,
    });

    let exit: MembershipExit;
    let action: "MEMBER_RESIGNED" | "MEMBER_REMOVED";
    let afterValue: Record<string, unknown>;
    let baseMetadata: Record<string, unknown> | undefined;
    if (isResign) {
      const resignData = validation.data as ResignCommitteeData;
      const trimmedNotes = blankToNull(resignData.removalNotes);
      exit = {
        status: "RESIGNED",
        resignationDateReceived: new Date(resignData.resignationDateReceived),
        resignationMethod: resignData.resignationMethod,
        removalReason: null,
        removalNotes: trimmedNotes,
      };
      action = "MEMBER_RESIGNED";
      afterValue = {
        status: "RESIGNED",
        resignationDateReceived: resignData.resignationDateReceived,
        resignationMethod: resignData.resignationMethod,
        ...(trimmedNotes ? { removalNotes: trimmedNotes } : {}),
      };
      baseMetadata = undefined;
    } else {
      const removeData = validation.data as RemoveCommitteeData;
      const trimmedNotes = blankToNull(removeData.removalNotes);
      exit = {
        status: "REMOVED",
        resignationDateReceived: null,
        resignationMethod: null,
        removalReason: removeData.removalReason,
        removalNotes: trimmedNotes,
      };
      action = "MEMBER_REMOVED";
      afterValue = {
        status: "REMOVED",
        removalReason: removeData.removalReason,
        ...(trimmedNotes ? { removalNotes: trimmedNotes } : {}),
      };
      baseMetadata = { source: "manual" };
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const result = await writeMembershipExit(tx, membership, exit);
      if (result.kind !== "written") return result.kind;

      await logAuditEventOrThrow(
        userId,
        userRole,
        action,
        "CommitteeMembership",
        membership.id,
        {
          status: ACTIVE_MEMBERSHIP_STATUS,
          ...(membership.seatNumber != null
            ? { seatNumber: membership.seatNumber }
            : {}),
        },
        afterValue,
        mergeAuditMetadata(
          { ...baseMetadata, ...supersededExitReportMetadata(result) },
          membershipSubject,
        ),
        tx,
      );
      return "written" as const;
    });

    if (outcome !== "written") {
      return NextResponse.json(
        { status: "error", error: MEMBER_CHANGED_MESSAGE },
        { status: 409 },
      );
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: isResign ? "resignCommittee" : "removeCommittee" },
      extra: { cityTown, legDistrict, electionDistrict, memberId },
    });
    return NextResponse.json(
      { status: "error", error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, removeCommitteeHandler);
