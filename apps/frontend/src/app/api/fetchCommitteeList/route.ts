import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";

async function getCommitteeList(req: NextRequest) {
  const electionDistrict = req.nextUrl.searchParams.get("electionDistrict");
  const cityTown = req.nextUrl.searchParams.get("cityTown");
  const legDistrict = req.nextUrl.searchParams.get("legDistrict");

  if (
    !electionDistrict ||
    !cityTown ||
    Array.isArray(electionDistrict) ||
    !/^\d+$/.test(electionDistrict.trim())
  ) {
    return NextResponse.json(
      { error: "Invalid election district" },
      { status: 400 },
    );
  }

  try {
    const committee = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: cityTown,
          legDistrict: legDistrict ? Number(legDistrict) : -1,
          electionDistrict: parseInt(electionDistrict),
        },
      },
      include: {
        committeeMemberList: true,
      },
    });

    if (!committee) {
      return NextResponse.json(
        { error: "Committee not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(committee, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getCommitteeList);
