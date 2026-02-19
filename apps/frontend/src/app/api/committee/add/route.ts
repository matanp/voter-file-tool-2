import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel, Prisma } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { committeeDataSchema } from "~/lib/validations/committee";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { toDbSentinelValue } from "@voter-file-tool/shared-validators";
import {
  ALREADY_IN_ANOTHER_COMMITTEE_ERROR,
  getActiveTermId,
  getGovernanceConfig,
  isVoterActiveInAnotherCommittee,
  countActiveMembers,
} from "~/app/api/lib/committeeValidation";
import {
  assignNextAvailableSeat,
  ensureSeatsExist,
} from "~/app/api/lib/seatUtils";
import type { Session } from "next-auth";
import * as Sentry from "@sentry/nextjs";
import { logAuditEvent } from "~/lib/auditLog";

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
  } = validation.data;

  const legDistrictForDb = toDbSentinelValue(legDistrict);

  try {
    const activeTermId = await getActiveTermId();
    const config = await getGovernanceConfig();

    // Upsert the CommitteeList record (still needed as the FK target for CommitteeMembership)
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

    await ensureSeatsExist(committee.id, activeTermId);

    // Check for existing CommitteeMembership (idempotent — any non-terminal status)
    const existingMembership = await prisma.committeeMembership.findUnique({
      where: {
        voterRecordId_committeeListId_termId: {
          voterRecordId: memberId,
          committeeListId: committee.id,
          termId: activeTermId,
        },
      },
    });

    if (existingMembership?.status === "ACTIVE") {
      return NextResponse.json(
        {
          success: true,
          message: "Member already active in this committee",
          idempotent: true,
        },
        { status: 200 },
      );
    }

    // SRS §7.1: Reject if voter is already ACTIVE in another committee for this term
    if (
      await isVoterActiveInAnotherCommittee(memberId, committee.id, activeTermId)
    ) {
      return NextResponse.json(
        { success: false, error: ALREADY_IN_ANOTHER_COMMITTEE_ERROR },
        { status: 400 },
      );
    }

    // SRS §7.1: Capacity check — count ACTIVE CommitteeMembership records for this committee+term
    const activeCount = await countActiveMembers(committee.id, activeTermId);
    if (activeCount >= config.maxSeatsPerLted) {
      return NextResponse.json(
        { success: false, error: "Committee is at capacity" },
        { status: 400 },
      );
    }

    const seatNumber = await assignNextAvailableSeat(committee.id, activeTermId);

    // Create CommitteeMembership with status=ACTIVE (admin direct-add)
    if (existingMembership) {
      // Re-activate a previously non-active membership
      await prisma.committeeMembership.update({
        where: { id: existingMembership.id },
        data: {
          status: "ACTIVE",
          activatedAt: new Date(),
          membershipType,
          seatNumber,
        },
      });
      await logAuditEvent(
        session.user.id,
        session.user.privilegeLevel as PrivilegeLevel,
        "MEMBER_ACTIVATED",
        "CommitteeMembership",
        existingMembership.id,
        { status: existingMembership.status },
        { status: "ACTIVE" },
      );
    } else {
      const newMembership = await prisma.committeeMembership.create({
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
        session.user.id,
        session.user.privilegeLevel as PrivilegeLevel,
        "MEMBER_ACTIVATED",
        "CommitteeMembership",
        newMembership.id,
        null,
        { status: "ACTIVE" },
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
