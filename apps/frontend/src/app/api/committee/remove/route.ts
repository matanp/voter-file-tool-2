import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { committeeDataSchema } from "~/lib/validations/committee";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import type { Session } from "next-auth";
import { ZodError } from "zod";

async function removeCommitteeHandler(req: NextRequest, session: Session) {
  let cityTown: string;
  let legDistrict: string;
  let electionDistrict: string;
  let memberId: string;

  try {
    const body = (await req.json()) as unknown;
    const validatedData = committeeDataSchema.parse(body);
    cityTown = validatedData.cityTown;
    legDistrict = validatedData.legDistrict;
    electionDistrict = validatedData.electionDistrict;
    memberId = validatedData.memberId;

    // Additional validation for numeric fields
    const legDistrictNum = Number(legDistrict);
    const electionDistrictNum = Number(electionDistrict);
    const validInts =
      Number.isInteger(legDistrictNum) &&
      Number.isInteger(electionDistrictNum) &&
      legDistrictNum > 0 &&
      electionDistrictNum > 0;
    if (!validInts) {
      return NextResponse.json(
        { error: "Invalid numeric fields" },
        { status: 400 },
      );
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const existingElectionDistrict = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: cityTown,
          legDistrict: parseInt(legDistrict, 10),
          electionDistrict: parseInt(electionDistrict, 10),
        },
      },
      include: { committeeMemberList: true },
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, removeCommitteeHandler);
