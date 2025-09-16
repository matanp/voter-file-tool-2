import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { committeeDataSchema } from "~/lib/validations/committee";
import { PrivilegeLevel, Prisma } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import type { Session } from "next-auth";

async function removeCommitteeHandler(req: NextRequest, _session: Session) {
  const body = (await req.json()) as unknown;
  const validation = validateRequest(body, committeeDataSchema);

  if (!validation.success) {
    return validation.response;
  }

  const { cityTown, legDistrict, electionDistrict, memberId } = validation.data;

  // Convert undefined legDistrict to -1 for database storage
  const legDistrictForDb = legDistrict ?? -1;

  try {
    const existingElectionDistrict = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: cityTown,
          legDistrict: legDistrictForDb,
          electionDistrict: electionDistrict,
        },
      },
    });

    if (!existingElectionDistrict) {
      return NextResponse.json(
        { error: "Committee not found" },
        { status: 404 },
      );
    }

    await prisma.voterRecord.update({
      where: { VRCNUM: memberId },
      data: {
        committeeId: null,
      },
    });

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error) {
    console.error(error);

    // Handle Prisma known errors with specific status codes
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        // Record not found (member to update not found)
        return NextResponse.json(
          { error: "Member not found" },
          { status: 404 },
        );
      }
    }

    // Default fallback for all other errors
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, removeCommitteeHandler);
