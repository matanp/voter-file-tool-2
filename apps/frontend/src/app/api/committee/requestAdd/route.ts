/**
 * POST /api/committee/requestAdd — a Leader (RequestAccess and above) submits
 * a candidate for Admin review: a SUBMITTED membership.
 *
 * With `removeMemberId` it is a replacement (ticket 09): the Submission plus an
 * Exit Report on the member being replaced, filed in one transaction, with the
 * outgoing row's `replacementMembershipId` pointing at the candidate. The
 * outgoing member's exit comes in `exitReport`. If they already have a pending
 * report, the request names it (`existingExitReportedAt`, the report the
 * Leader saw) and the replacement pairs with it rather than filing a second;
 * `exitReport` alongside rewrites its fields. Both writes are conditional on
 * the report the Leader saw (409 otherwise).
 */
import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { type Prisma, PrivilegeLevel } from "@prisma/client";
import { committeeRequestDataSchema } from "~/lib/validations/committee";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { toDbSentinelValue } from "@voter-file-tool/shared-validators";
import {
  ACTIVE_MEMBERSHIP_STATUS,
  getActiveTermId,
  getUserJurisdictions,
  committeeMatchesJurisdictions,
} from "~/app/api/lib/committeeValidation";
import type { Session } from "next-auth";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import { validateEligibility } from "~/lib/eligibility";
import {
  buildMembershipAuditSubject,
  mergeAuditMetadata,
} from "~/lib/auditMembershipSubject";
import {
  fileExitReport,
  pairExitReportWithReplacement,
  unpairReplacement,
} from "~/app/api/lib/membershipExit";
import {
  exitReportedAuditValue,
  toExitReportInput,
} from "~/app/api/lib/exitReportInput";
import { MEMBER_CHANGED_MESSAGE } from "~/app/api/lib/exitReportAccess";

/** A conditional write on the outgoing member lost a race; rolls the transaction back. */
class OutgoingMemberChanged extends Error {}

function conflict(error: string) {
  return NextResponse.json({ success: false, error }, { status: 409 });
}

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
    exitReport,
    existingExitReportedAt,
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
  const userRole = session.user.privilegeLevel;
  const isAdmin = userRole === PrivilegeLevel.Admin;
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
  const outgoingVoterId = removeMemberId?.trim();
  if (outgoingVoterId === sanitizedAddMemberId) {
    return NextResponse.json(
      { success: false, error: "A member can't replace themselves" },
      { status: 422 },
    );
  }

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
      include: { term: { select: { id: true, label: true } } },
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
    if (userRole === PrivilegeLevel.Leader) {
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

    // A replacement's outgoing member: ACTIVE here, and its pending report
    // (if any) the one the Leader saw and not already paired.
    let outgoing: Awaited<ReturnType<typeof findOutgoing>> = null;
    if (outgoingVoterId) {
      outgoing = await findOutgoing(
        outgoingVoterId,
        committeeRequested.id,
        activeTermId,
      );
      if (!outgoing || outgoing.status !== ACTIVE_MEMBERSHIP_STATUS) {
        return NextResponse.json(
          {
            success: false,
            error:
              "The member being replaced is not an active member of this committee",
          },
          { status: 422 },
        );
      }
      if (outgoing.exitReportedAt === null) {
        if (existingExitReportedAt !== undefined) {
          return conflict(MEMBER_CHANGED_MESSAGE);
        }
        if (exitReport === undefined) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Say whether the member being replaced resigned or should be removed",
            },
            { status: 422 },
          );
        }
      } else {
        if (existingExitReportedAt === undefined) {
          return conflict(
            "An exit has already been reported for the member being replaced. Refresh to see it.",
          );
        }
        if (
          outgoing.exitReportedAt.getTime() !==
          new Date(existingExitReportedAt).getTime()
        ) {
          return conflict(MEMBER_CHANGED_MESSAGE);
        }
      }
    }

    // SRS §2.2 — Persist warning snapshot and include in audit
    const eligibilityWarnings = eligibility.warnings;
    const requestMetadata = {
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
      // Idempotent for the same request; a replacement can't be bolted onto
      // a candidate already pending as something else.
      const sameRequest = outgoing
        ? outgoing.replacementMembershipId === existing.id
        : !(await prisma.committeeMembership.findUnique({
            where: { replacementMembershipId: existing.id },
            select: { id: true },
          }));
      if (!sameRequest) {
        return conflict(
          "This candidate already has a pending submission for this committee",
        );
      }
      return NextResponse.json(
        { success: true, message: "Request already submitted" },
        { status: 200 },
      );
    }

    if (outgoing && outgoing.replacementMembershipId !== null) {
      return conflict(
        "The member being replaced is already paired with another pending candidate",
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
    const auditMetadataWithWarnings = {
      ...auditMetadata,
      ...(eligibilityWarnings.length > 0 ? { eligibilityWarnings } : {}),
      // Committee History names the member a submission would replace from
      // here (the Submission itself no longer carries it).
      ...(outgoing ? { removeMemberId: outgoing.voterRecordId } : {}),
    };

    const voterRecord = await prisma.voterRecord.findUnique({
      where: { VRCNUM: sanitizedAddMemberId },
      select: {
        VRCNUM: true,
        firstName: true,
        middleInitial: true,
        lastName: true,
      },
    });

    if (!voterRecord) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 },
      );
    }

    const membershipSubject = buildMembershipAuditSubject({
      voterRecord,
      committee: committeeRequested,
      term: committeeRequested.term,
      seatNumber: null,
    });
    const auditMetadataWithSubject = mergeAuditMetadata(
      Object.keys(auditMetadataWithWarnings).length > 0
        ? auditMetadataWithWarnings
        : undefined,
      membershipSubject,
    );

    /** The outgoing half, in the Submission's transaction. */
    const fileOutgoingExit = async (
      tx: Prisma.TransactionClient,
      candidateId: string,
    ) => {
      if (!outgoing) return;
      const reported = exitReport
        ? toExitReportInput(exitReport, userId)
        : undefined;
      const before = outgoing.exitReportedAt;
      const at =
        before === null
          ? reported &&
            (await fileExitReport(tx, outgoing.id, reported, {
              replacementMembershipId: candidateId,
            }))
          : await pairExitReportWithReplacement(
              tx,
              outgoing.id,
              before,
              candidateId,
              reported,
            );
      if (!at) throw new OutgoingMemberChanged();
      if (!reported || !exitReport) return; // paired as reported; nothing new to audit

      await logAuditEventOrThrow(
        userId,
        userRole,
        "MEMBER_EXIT_REPORTED",
        "CommitteeMembership",
        outgoing.id,
        before === null
          ? { status: ACTIVE_MEMBERSHIP_STATUS }
          : {
              status: ACTIVE_MEMBERSHIP_STATUS,
              exitReportedAt: before.toISOString(),
              exitReportedKind: outgoing.exitReportedKind,
              removalReason: outgoing.removalReason,
            },
        exitReportedAuditValue(at, exitReport, reported),
        mergeAuditMetadata(
          {
            reason: "replacement",
            replacementMembershipId: candidateId,
            ...(before !== null ? { updatedReport: true } : {}),
          },
          buildMembershipAuditSubject({
            voterRecord: outgoing.voterRecord,
            committee: committeeRequested,
            term: committeeRequested.term,
            seatNumber: outgoing.seatNumber,
          }),
        ),
        tx,
      );
    };

    if (existing) {
      await prisma.$transaction(async (tx) => {
        // The row is reused; a pairing left from its last submission must not
        // attach to this one.
        await unpairReplacement(tx, existing.id);
        const resubmitted = await tx.committeeMembership.update({
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

        await logAuditEventOrThrow(
          userId,
          userRole,
          "MEMBER_SUBMITTED",
          "CommitteeMembership",
          resubmitted.id,
          { status: existing.status },
          { status: "SUBMITTED" },
          auditMetadataWithSubject as Prisma.InputJsonValue | undefined,
          tx,
        );
        await fileOutgoingExit(tx, resubmitted.id);
      });

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
    await prisma.$transaction(async (tx) => {
      const newMembership = await tx.committeeMembership.create({
        data: {
          voterRecordId: sanitizedAddMemberId,
          committeeListId: committeeRequested.id,
          termId: activeTermId,
          status: "SUBMITTED",
          submittedById: userId,
          submissionMetadata: requestMetadata,
        },
      });

      await logAuditEventOrThrow(
        userId,
        userRole,
        "MEMBER_SUBMITTED",
        "CommitteeMembership",
        newMembership.id,
        null,
        { status: "SUBMITTED" },
        auditMetadataWithSubject as Prisma.InputJsonValue | undefined,
        tx,
      );
      await fileOutgoingExit(tx, newMembership.id);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Request created",
        ...(eligibilityWarnings.length > 0 ? { warnings: eligibilityWarnings } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof OutgoingMemberChanged) {
      return conflict(MEMBER_CHANGED_MESSAGE);
    }
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

function findOutgoing(
  voterRecordId: string,
  committeeListId: number,
  termId: string,
) {
  return prisma.committeeMembership.findUnique({
    where: {
      voterRecordId_committeeListId_termId: {
        voterRecordId,
        committeeListId,
        termId,
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
}

export const POST = withPrivilege(
  PrivilegeLevel.RequestAccess,
  requestAddHandler,
);
