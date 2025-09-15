import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel, Prisma } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { committeeDataSchema } from "~/lib/validations/committee";
import { ZodError } from "zod";

async function addCommitteeHandler(req: NextRequest) {
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
    const updatedCommittee = await prisma.committeeList.upsert({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: cityTown,
          legDistrict: Number(legDistrict),
          electionDistrict: Number(electionDistrict),
        },
      },
      update: {
        committeeMemberList: {
          connect: { VRCNUM: memberId },
        },
      },
      create: {
        cityTown: cityTown,
        legDistrict: Number(legDistrict),
        electionDistrict: Number(electionDistrict),
        committeeMemberList: {
          connect: { VRCNUM: memberId },
        },
      },
      include: {
        committeeMemberList: true,
      },
    });

    return NextResponse.json(updatedCommittee, { status: 200 });
  } catch (error) {
    console.error(error);

    // Handle Prisma known errors with specific status codes
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        // Record not found (member to connect not found)
        return NextResponse.json(
          { error: "Member not found" },
          { status: 404 },
        );
      } else if (error.code === "P2002") {
        // Unique constraint violation (duplicate relation)
        return NextResponse.json(
          { error: "Duplicate relation - member already exists in committee" },
          { status: 409 },
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

export const POST = withPrivilege(PrivilegeLevel.Admin, addCommitteeHandler);
