import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { committeeRequestDataSchema } from "~/lib/validations/committee";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { toDbSentinelValue } from "~/app/committees/committeeUtils";
import type { Session } from "next-auth";

async function requestAddHandler(req: NextRequest, _session: Session) {
  const body = (await req.json()) as unknown;
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
  const legDistrictForDb = toDbSentinelValue(legDistrict);

  const sanitizedAddMemberId = addMemberId?.trim();
  const sanitizedRemoveMemberId = removeMemberId?.trim();

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
        { error: "Committee not found" },
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
      { status: "success", message: "Request created" },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.RequestAccess,
  requestAddHandler,
);
