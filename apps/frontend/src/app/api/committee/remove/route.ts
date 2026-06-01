import { type NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import prisma from "~/lib/prisma";
import {
  removeCommitteeDataSchema,
  resignCommitteeDataSchema,
} from "~/lib/validations/committee";
import { PrivilegeLevel, type RemovalReason } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { toDbSentinelValue } from "@voter-file-tool/shared-validators";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import type { Session } from "next-auth";
import { logAuditEventOrThrow } from "~/lib/auditLog";

/** SRS 2.3 — Handle resignation: validate resign body, update membership to RESIGNED, log MEMBER_RESIGNED. */
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

    if (membership.status !== "ACTIVE") {
      return NextResponse.json(
        {
          status: "error",
          error: "Member does not have an active membership in this committee",
        },
        { status: 400 },
      );
    }

    if (isResign) {
      const resignData = validation.data as {
        resignationReason: RemovalReason;
        resignationDateReceived: string;
        resignationMethod: "EMAIL" | "MAIL";
        removalNotes?: string;
      };
      const resignationDateReceived = new Date(
        resignData.resignationDateReceived,
      );
      const trimmedNotes = resignData.removalNotes?.trim();

      await prisma.$transaction(async (tx) => {
        await tx.committeeMembership.update({
          where: { id: membership.id },
          data: {
            status: "RESIGNED",
            resignedAt: new Date(),
            resignationDateReceived,
            resignationMethod: resignData.resignationMethod,
            removalReason: resignData.resignationReason,
            ...(trimmedNotes ? { removalNotes: trimmedNotes } : {}),
          },
        });

        await logAuditEventOrThrow(
          session.user.id,
          session.user.privilegeLevel,
          "MEMBER_RESIGNED",
          "CommitteeMembership",
          membership.id,
          {
            status: "ACTIVE",
            ...(membership.seatNumber != null
              ? { seatNumber: membership.seatNumber }
              : {}),
          },
          {
            status: "RESIGNED",
            resignationDateReceived: resignData.resignationDateReceived,
            resignationMethod: resignData.resignationMethod,
            resignationReason: resignData.resignationReason,
            removalReason: resignData.resignationReason,
            ...(trimmedNotes ? { removalNotes: trimmedNotes } : {}),
          },
          undefined,
          tx,
        );
      });

      return NextResponse.json({ status: "success" }, { status: 200 });
    }

    const removeData = validation.data as {
      removalReason: RemovalReason;
      removalNotes?: string;
    };
    const trimmedNotes = removeData.removalNotes?.trim();
    await prisma.$transaction(async (tx) => {
      await tx.committeeMembership.update({
        where: { id: membership.id },
        data: {
          status: "REMOVED",
          removedAt: new Date(),
          removalReason: removeData.removalReason,
          ...(trimmedNotes ? { removalNotes: trimmedNotes } : {}),
        },
      });

      await logAuditEventOrThrow(
        userId,
        userRole,
        "MEMBER_REMOVED",
        "CommitteeMembership",
        membership.id,
        {
          status: "ACTIVE",
          ...(membership.seatNumber != null
            ? { seatNumber: membership.seatNumber }
            : {}),
        },
        {
          status: "REMOVED",
          removalReason: removeData.removalReason,
          ...(trimmedNotes ? { removalNotes: trimmedNotes } : {}),
        },
        { source: "manual" },
        tx,
      );
    });

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
