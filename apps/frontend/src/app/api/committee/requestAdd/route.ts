import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { type Prisma, PrivilegeLevel } from "@prisma/client";
import { committeeRequestDataSchema } from "~/lib/validations/committee";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { toDbSentinelValue } from "@voter-file-tool/shared-validators";
import {
  getActiveTermId,
  getUserJurisdictions,
  committeeMatchesJurisdictions,
} from "~/app/api/lib/committeeValidation";
import type { Session } from "next-auth";
import { logAuditEvent } from "~/lib/auditLog";
import { validateEligibility } from "~/lib/eligibility";

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
    forceAdd,
    overrideReason,
    email,
    phone,
  } = validation.data;

  if (!session.user?.id) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  const userId = session.user.id;
  const userPrivilegeLevel = session.user.privilegeLevel;
  const isAdmin = userPrivilegeLevel === PrivilegeLevel.Admin;
  const eligibilityOptions =
    isAdmin && forceAdd
      ? { forceAdd: true, overrideReason: overrideReason ?? "" }
      : undefined;

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

    // SRS 3.1 — Leader may only submit to committees in their jurisdictions
    if (userPrivilegeLevel === PrivilegeLevel.Leader) {
      const jurisdictions = await getUserJurisdictions(
        userId,
        activeTermId,
        PrivilegeLevel.Leader,
      );
      if (
        !committeeMatchesJurisdictions(
          committeeRequested.cityTown,
          committeeRequested.legDistrict,
          jurisdictions ?? [],
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "You do not have jurisdiction access for this committee",
          },
          { status: 403 },
        );
      }
    }

    const eligibility = await validateEligibility(
      sanitizedAddMemberId,
      committeeRequested.id,
      activeTermId,
      eligibilityOptions,
    );

    if (eligibility.validationError) {
      return NextResponse.json(
        {
          success: false,
          error: eligibility.validationError,
        },
        { status: 422 },
      );
    }

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          success: false,
          error: "INELIGIBLE",
          reasons: eligibility.hardStops,
        },
        { status: 422 },
      );
    }

    // SRS §2.2 — Persist warning snapshot and include in audit
    const eligibilityWarnings = eligibility.warnings;
    const requestMetadata = {
      ...(removeMemberId ? { removeMemberId: removeMemberId.trim() } : {}),
      ...(requestNotes ? { requestNotes } : {}),
      ...(email?.trim() ? { email: email.trim() } : {}),
      ...(phone?.trim() ? { phone: phone.trim() } : {}),
      ...(eligibilityWarnings.length > 0
        ? {
            eligibilityWarnings:
              eligibilityWarnings as unknown as Prisma.InputJsonValue,
          }
        : {}),
    } as Prisma.InputJsonValue;

    // Check for existing membership (idempotent/transition)
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

    const auditMetadata =
      eligibility.bypassedReasons?.length && eligibilityOptions?.overrideReason
        ? ({
            bypassedReasons: eligibility.bypassedReasons,
            overrideReason: eligibilityOptions.overrideReason,
          } as Record<string, unknown>)
        : undefined;
    const auditMetadataWithWarnings =
      eligibilityWarnings.length > 0
        ? { ...auditMetadata, eligibilityWarnings }
        : auditMetadata;

    if (existing) {
      const resubmitted = await prisma.committeeMembership.update({
        where: { id: existing.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          submittedById: userId,
          membershipType: null,
          seatNumber: null,
          activatedAt: null,
          confirmedAt: null,
          resignedAt: null,
          removedAt: null,
          rejectedAt: null,
          rejectionNote: null,
          resignationDateReceived: null,
          resignationMethod: null,
          removalReason: null,
          removalNotes: null,
          petitionVoteCount: null,
          petitionPrimaryDate: null,
          // Rebuild metadata from the current request intent.
          submissionMetadata: requestMetadata,
        },
      });

      await logAuditEvent(
        userId,
        userPrivilegeLevel,
        "MEMBER_SUBMITTED",
        "CommitteeMembership",
        resubmitted.id,
        { status: existing.status },
        { status: "SUBMITTED" },
        auditMetadataWithWarnings as Prisma.InputJsonValue | undefined,
      );

      return NextResponse.json(
        {
          success: true,
          message: "Request created",
          ...(eligibilityWarnings.length > 0
            ? { warnings: eligibilityWarnings } : {}),
        },
        { status: 201 },
      );
    }

    // Create CommitteeMembership with status=SUBMITTED
    const newMembership = await prisma.committeeMembership.create({
      data: {
        voterRecordId: sanitizedAddMemberId,
        committeeListId: committeeRequested.id,
        termId: activeTermId,
        status: "SUBMITTED",
        submittedById: userId,
        // Store intended replacement target and notes for admin review.
        submissionMetadata: requestMetadata,
      },
    });

    await logAuditEvent(
      userId,
      userPrivilegeLevel,
      "MEMBER_SUBMITTED",
      "CommitteeMembership",
      newMembership.id,
      null,
      { status: "SUBMITTED" },
      auditMetadataWithWarnings as Prisma.InputJsonValue | undefined,
    );

    return NextResponse.json(
      {
        success: true,
        message: "Request created",
        ...(eligibilityWarnings.length > 0 ? { warnings: eligibilityWarnings } : {}),
      },
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
