import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { fetchCommitteeListQuerySchema } from "~/lib/validations/committee";
import { toDbSentinelValue } from "@voter-file-tool/shared-validators";
import {
  getActiveTermId,
  getGovernanceConfig,
} from "~/app/api/lib/committeeValidation";
import { computeDesignationWeightFromData } from "~/lib/designationWeight";

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
    includeDesignationWeightSummary:
      req.nextUrl.searchParams.get("includeDesignationWeightSummary") ??
      undefined,
  };

  const validation = validateRequest(queryParams, fetchCommitteeListQuerySchema);

  if (!validation.success) {
    return validation.response;
  }

  const {
    electionDistrict,
    cityTown,
    legDistrict,
    includeDesignationWeightSummary,
  } = validation.data;

  try {
    const parsedLegDistrict = toDbSentinelValue(legDistrict ?? undefined);
    const parsedElectionDistrict = Number(electionDistrict);
    const activeTermId = await getActiveTermId();

    const committee = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict_termId: {
          cityTown: cityTown ?? "",
          legDistrict: parsedLegDistrict,
          electionDistrict: parsedElectionDistrict,
          termId: activeTermId,
        },
      },
      include: {
        // SRS 1.2 — Return active memberships with voter data
        memberships: {
          where: { status: "ACTIVE", termId: activeTermId },
          include: { voterRecord: true },
        },
        // SRS 1.4 — Seat roster with weight
        seats: { orderBy: { seatNumber: "asc" } },
      },
    });

    if (!committee) {
      return NextResponse.json(
        { error: "Committee not found" },
        { status: 404 },
      );
    }

    const config = await getGovernanceConfig();
    const designationWeightSummary = includeDesignationWeightSummary
      ? computeDesignationWeightFromData({
          committeeListId: committee.id,
          termId: activeTermId,
          seats: committee.seats,
          activeMemberships: committee.memberships.map((m) => ({
            seatNumber: m.seatNumber,
            membershipType: m.membershipType,
            voterRecordId: m.voterRecordId,
          })),
        })
      : undefined;

    return NextResponse.json(
      {
        ...committee,
        maxSeatsPerLted: config.maxSeatsPerLted,
        ...(designationWeightSummary
          ? { designationWeightSummary }
          : {}),
      },
      { status: 200 },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Data integrity error")
    ) {
      Sentry.captureException(error, {
        tags: { route: "fetchCommitteeList" },
        extra: {
          cityTown,
          electionDistrict,
          legDistrict: legDistrict ?? null,
          includeDesignationWeightSummary:
            includeDesignationWeightSummary ?? null,
        },
      });
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getCommitteeList);
