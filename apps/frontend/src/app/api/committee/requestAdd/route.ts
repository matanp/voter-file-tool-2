import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";
import { PrivilegeLevel } from "@prisma/client";
import type { CommitteeRequestData } from "~/lib/validations/committee";
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (
    !hasPermissionFor(session.user.privilegeLevel, PrivilegeLevel.RequestAccess)
  ) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

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
    !Number.isInteger(Number(electionDistrict)) ||
    !Number(legDistrict)
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
      throw new Error("Committee not found");
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
