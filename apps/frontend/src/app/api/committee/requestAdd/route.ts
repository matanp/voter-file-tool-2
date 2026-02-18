import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { committeeRequestDataSchema } from "~/lib/validations/committee";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { toDbSentinelValue } from "@voter-file-tool/shared-validators";
import {
  ALREADY_IN_ANOTHER_COMMITTEE_ERROR,
  getActiveTermId,
  isVoterActiveInAnotherCommittee,
} from "~/app/api/lib/committeeValidation";
import type { Session } from "next-auth";

async function requestAddHandler(req: NextRequest, session: Session) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON format",
        success: false,
        details: "Request body must be valid JSON",
      },
      { status: 400 },
    );
  }

  const validation = validateRequest(body, committeeRequestDataSchema);

  if (!validation.success) {
    return validation.response;
  }

  const {
    cityTown,
    legDistrict,
    electionDistrict,
    addMemberId,
    removeMemberId,
    requestNotes,
  } = validation.data;

  // SRS 1.2: addMemberId is required for the new CommitteeMembership flow.
  // Remove-only requests are an admin action; leaders should contact an admin.
  if (!addMemberId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "An add member ID is required. To remove a committee member, please contact your administrator.",
      },
      { status: 422 },
    );
  }

  let legDistrictForDb;
  try {
    legDistrictForDb = toDbSentinelValue(legDistrict);
  } catch {
    return NextResponse.json(
      {
        error: "Invalid legDistrict value",
        success: false,
        details: "legDistrict conversion failed",
      },
      { status: 422 },
    );
  }

  const sanitizedAddMemberId = addMemberId.trim();

  try {
    const activeTermId = await getActiveTermId();

    const committeeRequested = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict_termId: {
          cityTown,
          legDistrict: legDistrictForDb,
          electionDistrict,
          termId: activeTermId,
        },
      },
    });

    if (!committeeRequested) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Committee not found. Ensure you are submitting to the active term.",
        },
        { status: 404 },
      );
    }

    // SRS §7.1: Reject if add member is already ACTIVE in another committee
    if (
      await isVoterActiveInAnotherCommittee(
        sanitizedAddMemberId,
        committeeRequested.id,
        activeTermId,
      )
    ) {
      return NextResponse.json(
        { success: false, error: ALREADY_IN_ANOTHER_COMMITTEE_ERROR },
        { status: 400 },
      );
    }

    // Check for existing SUBMITTED membership (idempotent)
    const existing = await prisma.committeeMembership.findUnique({
      where: {
        voterRecordId_committeeListId_termId: {
          voterRecordId: sanitizedAddMemberId,
          committeeListId: committeeRequested.id,
          termId: activeTermId,
        },
      },
    });

    if (existing?.status === "SUBMITTED") {
      return NextResponse.json(
        { success: true, message: "Request already submitted" },
        { status: 200 },
      );
    }

    if (existing?.status === "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Member is already active in this committee" },
        { status: 400 },
      );
    }

    // Create CommitteeMembership with status=SUBMITTED
    await prisma.committeeMembership.create({
      data: {
        voterRecordId: sanitizedAddMemberId,
        committeeListId: committeeRequested.id,
        termId: activeTermId,
        status: "SUBMITTED",
        submittedById: session.user?.id ?? null,
        // Store intended replacement target and notes for admin review
        submissionMetadata: {
          ...(removeMemberId ? { removeMemberId: removeMemberId.trim() } : {}),
          ...(requestNotes ? { requestNotes } : {}),
        },
      },
    });

    return NextResponse.json(
      { success: true, message: "Request created" },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.RequestAccess,
  requestAddHandler,
);
