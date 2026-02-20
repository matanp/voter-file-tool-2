import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel, Prisma } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { committeeDataSchema } from "~/lib/validations/committee";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { toDbSentinelValue } from "@voter-file-tool/shared-validators";
import {
  getActiveTermId,
  getGovernanceConfig,
} from "~/app/api/lib/committeeValidation";
import {
  assignNextAvailableSeat,
  ensureSeatsExist,
} from "~/app/api/lib/seatUtils";
import type { Session } from "next-auth";
import * as Sentry from "@sentry/nextjs";
import { logAuditEvent } from "~/lib/auditLog";
import { validateEligibility } from "~/lib/eligibility";

async function addCommitteeHandler(req: NextRequest, session: Session) {
  const body = (await req.json()) as unknown;
  const validation = validateRequest(body, committeeDataSchema);

  if (!validation.success) {
    return validation.response;
  }

  const {
    cityTown,
    legDistrict,
    electionDistrict,
    memberId,
    membershipType = "APPOINTED",
    forceAdd,
    overrideReason,
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
  const isAdmin = userRole === PrivilegeLevel.Admin;
  const eligibilityOptions =
    isAdmin && forceAdd
      ? { forceAdd: true, overrideReason: overrideReason ?? "" }
      : undefined;

  try {
    const activeTermId = await getActiveTermId();
    const config = await getGovernanceConfig();

    // Upsert committee first so we have committeeListId for eligibility validation (SRS §2.1).
    const committee = await prisma.committeeList.upsert({
      where: {
        cityTown_legDistrict_electionDistrict_termId: {
          cityTown,
          legDistrict: legDistrictForDb,
          electionDistrict,
          termId: activeTermId,
        },
      },
      update: {},
      create: {
        cityTown,
        legDistrict: legDistrictForDb,
        electionDistrict,
        termId: activeTermId,
      },
    });

    const eligibility = await validateEligibility(
      memberId,
      committee.id,
      activeTermId,
      eligibilityOptions,
    );

    if (eligibility.validationError) {
      return NextResponse.json(
        { error: eligibility.validationError, success: false },
        { status: 422 },
      );
    }

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: "INELIGIBLE",
          reasons: eligibility.hardStops,
          success: false,
        },
        { status: 422 },
      );
    }

    const auditMetadata =
      eligibility.bypassedReasons?.length && eligibilityOptions?.overrideReason
        ? {
            bypassedReasons: eligibility.bypassedReasons,
            overrideReason: eligibilityOptions.overrideReason,
          }
        : undefined;

    const outcome = await prisma.$transaction(async (tx) => {
      // Lock committee row for atomic capacity+seat assignment (1.R.7).
      await tx.$queryRaw`
        SELECT id
        FROM "CommitteeList"
        WHERE id = ${committee.id}
        FOR UPDATE
      `;

      await ensureSeatsExist(committee.id, activeTermId, {
        tx,
        maxSeats: config.maxSeatsPerLted,
      });

      // Check for existing CommitteeMembership (idempotent — any non-terminal status)
      const existingMembership = await tx.committeeMembership.findUnique({
        where: {
          voterRecordId_committeeListId_termId: {
            voterRecordId: memberId,
            committeeListId: committee.id,
            termId: activeTermId,
          },
        },
      });

      if (existingMembership?.status === "ACTIVE") {
        return { kind: "idempotent" } as const;
      }

      // SRS §7.1: Reject if voter is already ACTIVE in another committee for this term
      const activeInAnotherCommittee = await tx.committeeMembership.findFirst({
        where: {
          voterRecordId: memberId,
          termId: activeTermId,
          status: "ACTIVE",
          NOT: { committeeListId: committee.id },
        },
        select: { id: true },
      });

      if (activeInAnotherCommittee) {
        return { kind: "anotherCommittee" } as const;
      }

      // SRS §7.1: Capacity check — count ACTIVE CommitteeMembership records for this committee+term
      const activeCount = await tx.committeeMembership.count({
        where: {
          committeeListId: committee.id,
          termId: activeTermId,
          status: "ACTIVE",
        },
      });
      if (activeCount >= config.maxSeatsPerLted) {
        return { kind: "atCapacity" } as const;
      }

      const seatNumber = await assignNextAvailableSeat(
        committee.id,
        activeTermId,
        {
          tx,
          maxSeats: config.maxSeatsPerLted,
        },
      );

      // Create CommitteeMembership with status=ACTIVE (admin direct-add)
      if (existingMembership) {
        // Re-activate a previously non-active membership.
        await tx.committeeMembership.update({
          where: { id: existingMembership.id },
          data: {
            status: "ACTIVE",
            activatedAt: new Date(),
            membershipType,
            seatNumber,
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
          },
        });
        await logAuditEvent(
          userId,
          userRole,
          "MEMBER_ACTIVATED",
          "CommitteeMembership",
          existingMembership.id,
          { status: existingMembership.status },
          { status: "ACTIVE" },
          auditMetadata,
          tx,
        );
      } else {
        const newMembership = await tx.committeeMembership.create({
          data: {
            voterRecordId: memberId,
            committeeListId: committee.id,
            termId: activeTermId,
            status: "ACTIVE",
            activatedAt: new Date(),
            membershipType,
            seatNumber,
          },
        });
        await logAuditEvent(
          userId,
          userRole,
          "MEMBER_ACTIVATED",
          "CommitteeMembership",
          newMembership.id,
          null,
          { status: "ACTIVE" },
          auditMetadata,
          tx,
        );
      }

      return { kind: "added" } as const;
    });

    if (outcome.kind === "idempotent") {
      return NextResponse.json(
        {
          success: true,
          message: "Member already active in this committee",
          idempotent: true,
        },
        { status: 200 },
      );
    }

    if (outcome.kind === "anotherCommittee") {
      return NextResponse.json(
        {
          success: false,
          error: "INELIGIBLE",
          reasons: ["ALREADY_IN_ANOTHER_COMMITTEE"] as const,
        },
        { status: 422 },
      );
    }

    if (outcome.kind === "atCapacity") {
      return NextResponse.json(
        {
          success: false,
          error: "INELIGIBLE",
          reasons: ["CAPACITY"] as const,
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Member added to committee",
      },
      { status: 200 },
    );
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        operation: "addCommittee",
        cityTown,
        legDistrict: legDistrictForDb.toString(),
        electionDistrict: electionDistrict.toString(),
        memberId,
      },
      extra: {
        requestBody: { cityTown, legDistrict, electionDistrict, memberId },
      },
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { success: false, error: "Member not found" },
          { status: 404 },
        );
      } else if (error.code === "P2002") {
        return NextResponse.json(
          {
            success: true,
            message: "Member already connected to committee (idempotent)",
            idempotent: true,
          },
          { status: 200 },
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, addCommitteeHandler);
