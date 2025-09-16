import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel, Prisma } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { committeeDataSchema } from "~/lib/validations/committee";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { toDbSentinelValue } from "~/app/committees/committeeUtils";
import type { Session } from "next-auth";
import * as Sentry from "@sentry/nextjs";

async function addCommitteeHandler(req: NextRequest, _session: Session) {
  const body = (await req.json()) as unknown;
  const validation = validateRequest(body, committeeDataSchema);

  if (!validation.success) {
    return validation.response;
  }

  const { cityTown, legDistrict, electionDistrict, memberId } = validation.data;

  // Convert undefined legDistrict to sentinel value for database storage
  const legDistrictForDb = toDbSentinelValue(legDistrict);

  try {
    // First check if the member is already connected to this committee
    const existingCommittee = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: cityTown,
          legDistrict: legDistrictForDb,
          electionDistrict: electionDistrict,
        },
      },
      include: {
        committeeMemberList: {
          where: { VRCNUM: memberId },
        },
      },
    });

    // If committee exists and member is already connected, return idempotent success
    if (existingCommittee && existingCommittee.committeeMemberList.length > 0) {
      return NextResponse.json(
        {
          success: true,
          message: "Member already connected to committee",
          committee: existingCommittee,
          idempotent: true,
        },
        { status: 200 },
      );
    }

    const updatedCommittee = await prisma.committeeList.upsert({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: cityTown,
          legDistrict: legDistrictForDb,
          electionDistrict: electionDistrict,
        },
      },
      update: {
        committeeMemberList: {
          connect: { VRCNUM: memberId },
        },
      },
      create: {
        cityTown: cityTown,
        legDistrict: legDistrictForDb,
        electionDistrict: electionDistrict,
        committeeMemberList: {
          connect: { VRCNUM: memberId },
        },
      },
      include: {
        committeeMemberList: true,
      },
    });

    // Determine if this was a creation or update based on whether committee existed
    const wasCreated = !existingCommittee;
    const statusCode = wasCreated ? 201 : 200;

    return NextResponse.json(
      {
        success: true,
        committee: updatedCommittee,
        message: wasCreated
          ? "Committee created and member added"
          : "Member added to committee",
      },
      { status: statusCode },
    );
  } catch (error) {
    // Use structured logging with Sentry
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

    // Handle Prisma known errors with specific status codes
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        // Record not found (member to connect not found)
        return NextResponse.json(
          { success: false, error: "Member not found" },
          { status: 404 },
        );
      } else if (error.code === "P2002") {
        // Unique constraint violation (duplicate relation) - treat as idempotent success
        // This handles concurrent race conditions where the same relation is created simultaneously
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

    // Default fallback for all other errors
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, addCommitteeHandler);
