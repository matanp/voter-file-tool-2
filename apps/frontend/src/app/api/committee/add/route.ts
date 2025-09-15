import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel, Prisma } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { committeeDataSchema } from "~/lib/validations/committee";
import { validateRequest } from "~/app/api/lib/validateRequest";
import type { Session } from "next-auth";

async function addCommitteeHandler(req: NextRequest, session: Session) {
  const body = (await req.json()) as unknown;
  const validation = validateRequest(body, committeeDataSchema);

  if (!validation.success) {
    return validation.response;
  }

  const { cityTown, legDistrict, electionDistrict, memberId } = validation.data;

  try {
    const updatedCommittee = await prisma.committeeList.upsert({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: cityTown,
          legDistrict: legDistrict,
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
        legDistrict: legDistrict,
        electionDistrict: electionDistrict,
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
