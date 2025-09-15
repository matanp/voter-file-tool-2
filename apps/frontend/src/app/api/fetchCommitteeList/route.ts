import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { fetchCommitteeListQuerySchema } from "~/lib/validations/committee";

async function getCommitteeList(req: NextRequest) {
  // Extract query parameters
  const queryParams = {
    electionDistrict: req.nextUrl.searchParams.get("electionDistrict"),
    cityTown: req.nextUrl.searchParams.get("cityTown"),
    legDistrict: req.nextUrl.searchParams.get("legDistrict"),
  };

  // Validate query parameters using the schema
  const validation = validateRequest(
    queryParams,
    fetchCommitteeListQuerySchema,
  );

  if (!validation.success) {
    return validation.response;
  }

  const { electionDistrict, cityTown, legDistrict } = validation.data;

  try {
    const parsedLegDistrict = legDistrict ? parseInt(legDistrict, 10) : -1;
    const parsedElectionDistrict = parseInt(electionDistrict, 10);

    const committee = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: cityTown,
          legDistrict: parsedLegDistrict,
          electionDistrict: parsedElectionDistrict,
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
