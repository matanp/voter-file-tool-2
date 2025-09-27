import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { committeeRequestDataSchema } from "~/lib/validations/committee";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { toDbSentinelValue } from "@voter-file-tool/shared-validators";
import type { Session } from "next-auth";

async function requestAddHandler(req: NextRequest, _session: Session) {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
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

  // Convert undefined legDistrict to sentinel value for database storage
  let legDistrictForDb;
  try {
    legDistrictForDb = toDbSentinelValue(legDistrict);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid legDistrict value",
        success: false,
        details: "legDistrict conversion failed",
      },
      { status: 422 },
    );
  }

  const sanitizedAddMemberId = addMemberId?.trim();
  const sanitizedRemoveMemberId = removeMemberId?.trim();

  // Require at least one action
  if (!sanitizedAddMemberId && !sanitizedRemoveMemberId) {
    return NextResponse.json(
      { error: "Invalid request data", success: false },
      { status: 422 },
    );
  }

  try {
    const committeeRequested = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: cityTown,
          legDistrict: legDistrictForDb,
          electionDistrict: electionDistrict,
        },
      },
    });

    if (!committeeRequested) {
      return NextResponse.json(
        { success: false, error: "Committee not found" },
        { status: 404 },
      );
    }

    await prisma.committeeRequest.create({
      data: {
        committeeListId: committeeRequested.id,
        addVoterRecordId: sanitizedAddMemberId
          ? sanitizedAddMemberId
          : undefined,
        removeVoterRecordId: sanitizedRemoveMemberId
          ? sanitizedRemoveMemberId
          : undefined,
        requestNotes: requestNotes,
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
