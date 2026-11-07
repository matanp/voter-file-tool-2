/**
 * POST /api/committee/resignation-letter/attach — an Admin attaches or
 * replaces the letter on a RESIGNED membership (ticket 08 decision 12). The
 * exit fields are untouched. Audited as `RESIGNATION_LETTER_ATTACHED`, with
 * `previousLetterKey` when it replaces one; the replaced object stays in R2.
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
import { MEMBER_CHANGED_MESSAGE } from "~/app/api/lib/exitReportAccess";
import {
  attachRecordedLetter,
  previousLetterMetadata,
  type ResignationLetter,
} from "~/app/api/lib/membershipExit";
import {
  discardPromotedLetter,
  promoteStagedLetter,
} from "~/app/api/lib/resignationLetterStorage";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import {
  buildMembershipAuditSubject,
  mergeAuditMetadata,
} from "~/lib/auditMembershipSubject";
import { attachResignationLetterSchema } from "~/lib/validations/committee";

async function attachLetterHandler(req: NextRequest, session: SessionWithUser) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON format" },
      { status: 400 },
    );
  }
  const validation = validateRequest(body, attachResignationLetterSchema);
  if (!validation.success) return validation.response;
  const { membershipId, letter: staged } = validation.data;
  const userId = session.user.id;
  const userRole = session.user.privilegeLevel;
  let promoted: ResignationLetter | null = null;

  try {
    const membership = await prisma.committeeMembership.findUnique({
      where: { id: membershipId },
      include: {
        voterRecord: {
          select: { VRCNUM: true, firstName: true, middleInitial: true, lastName: true },
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
    if (membership.status !== "RESIGNED") {
      return NextResponse.json(
        {
          success: false,
          error: "Letters can be attached only to a recorded resignation",
        },
        { status: 400 },
      );
    }

    const result = await promoteStagedLetter({ staged, userId, membershipId });
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }
    promoted = result.letter;
    const letter = result.letter;

    const attached = await prisma.$transaction(async (tx) => {
      if (!(await attachRecordedLetter(tx, membership, letter))) return false;
      await logAuditEventOrThrow(
        userId,
        userRole,
        "RESIGNATION_LETTER_ATTACHED",
        "CommitteeMembership",
        membershipId,
        { resignationLetterKey: membership.resignationLetterKey },
        {
          resignationLetterKey: letter.key,
          resignationLetterFileName: letter.fileName,
        },
        mergeAuditMetadata(
          previousLetterMetadata(membership),
          buildMembershipAuditSubject({
            voterRecord: membership.voterRecord,
            committee: membership.committeeList,
            term: membership.term,
            seatNumber: membership.seatNumber,
          }),
        ),
        tx,
      );
      return true;
    });

    if (!attached) {
      await discardPromotedLetter(promoted);
      return NextResponse.json(
        { success: false, error: MEMBER_CHANGED_MESSAGE },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    await discardPromotedLetter(promoted);
    Sentry.captureException(error, {
      tags: { operation: "resignationLetterAttach" },
      extra: { membershipId },
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, attachLetterHandler);
