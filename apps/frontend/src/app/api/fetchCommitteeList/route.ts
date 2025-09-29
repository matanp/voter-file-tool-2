import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { fetchCommitteeListQuerySchema } from "~/lib/validations/committee";
import {
  toDbSentinelValue,
  convertPrismaVoterRecordToAPI,
} from "@voter-file-tool/shared-validators";

async function getCommitteeList(req: NextRequest) {
  // Extract query parameters
  const legDistrictValues = req.nextUrl.searchParams.getAll("legDistrict");
  const legDistrictParam =
    legDistrictValues.length > 0 ? legDistrictValues[0] : undefined;

  // Validate multiple legDistrict parameters if provided
  if (legDistrictValues.length > 1) {
    for (const value of legDistrictValues) {
      if (value && value.trim() !== "") {
        const testParams = {
          electionDistrict: req.nextUrl.searchParams.get("electionDistrict"),
          cityTown: req.nextUrl.searchParams.get("cityTown"),
          legDistrict: value,
        };

        const validation = validateRequest(
          testParams,
          fetchCommitteeListQuerySchema,
        );

        if (!validation.success) {
          return validation.response;
        }
      }
    }
  }

  const queryParams = {
    electionDistrict: req.nextUrl.searchParams.get("electionDistrict"),
    cityTown: req.nextUrl.searchParams.get("cityTown"),
    legDistrict: legDistrictParam ?? undefined,
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
    const parsedLegDistrict = toDbSentinelValue(legDistrict ?? undefined);
    const parsedElectionDistrict = Number(electionDistrict);

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
        {
          success: false,
          error: "Committee not found",
        },
        { status: 404 },
      );
    }

    // Convert Prisma records to API format (Date -> string conversion)
    const apiCommittee = {
      ...committee,
      committeeMemberList: committee.committeeMemberList.map(
        convertPrismaVoterRecordToAPI,
      ),
    };

    return NextResponse.json(
      {
        success: true,
        data: apiCommittee,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getCommitteeList);
