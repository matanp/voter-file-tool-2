import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import type { CommitteeRequestData } from "~/lib/validations/committee";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import type { Session } from "next-auth";

async function requestAddHandler(req: NextRequest, session: Session) {
  const {
    cityTown,
    legDistrict,
    electionDistrict,
    addMemberId,
    removeMemberId,
    requestNotes,
  } = (await req.json()) as CommitteeRequestData;
  if (
    !cityTown ||
    !legDistrict ||
    !electionDistrict ||
    !requestNotes ||
    !Number.isInteger(Number(electionDistrict)) ||
    !Number(legDistrict) ||
    requestNotes.length > 1000
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const committeeRequested = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: cityTown,
          legDistrict: Number(legDistrict),
          electionDistrict: Number(electionDistrict),
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
        addVoterRecordId: addMemberId ? addMemberId : undefined,
        removeVoterRecordId: removeMemberId ? removeMemberId : undefined,
        requestNotes: requestNotes,
      },
    });

    return NextResponse.json(
      { status: "success", message: "Request created" },
      { status: 200 },
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
