import { type NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import prisma from "~/lib/prisma";
import { removeCommitteeDataSchema } from "~/lib/validations/committee";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { toDbSentinelValue } from "@voter-file-tool/shared-validators";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import type { Session } from "next-auth";
import { logAuditEvent } from "~/lib/auditLog";

async function removeCommitteeHandler(req: NextRequest, session: Session) {
  const body = (await req.json()) as unknown;
  const validation = validateRequest(body, removeCommitteeDataSchema);

  if (!validation.success) {
    return validation.response;
  }

  const {
    cityTown,
    legDistrict,
    electionDistrict,
    memberId,
    removalReason,
    removalNotes,
  } = validation.data;

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
    });

    if (!committee) {
      return NextResponse.json(
        { status: "error", error: "Committee not found" },
        { status: 404 },
      );
    }

    // Find the active CommitteeMembership for this voter+committee+term
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

    if (membership.status !== "ACTIVE") {
      return NextResponse.json(
        {
          status: "error",
          error: "Member does not have an active membership in this committee",
        },
        { status: 400 },
      );
    }

    await prisma.committeeMembership.update({
      where: { id: membership.id },
      data: {
        status: "REMOVED",
        removedAt: new Date(),
        ...(removalReason ? { removalReason } : {}),
        ...(removalNotes ? { removalNotes } : {}),
      },
    });

    await logAuditEvent(
      userId,
      userRole as PrivilegeLevel,
      "MEMBER_REMOVED",
      "CommitteeMembership",
      membership.id,
      { status: "ACTIVE" },
      {
        status: "REMOVED",
        ...(removalReason ? { removalReason } : {}),
        ...(removalNotes ? { removalNotes } : {}),
      },
    );

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: "removeCommittee" },
      extra: { cityTown, legDistrict, electionDistrict, memberId },
    });
    return NextResponse.json(
      { status: "error", error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, removeCommitteeHandler);
