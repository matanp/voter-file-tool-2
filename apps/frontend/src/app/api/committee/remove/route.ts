import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { committeeDataSchema } from "~/lib/validations/committee";
import { PrivilegeLevel, Prisma } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { toDbSentinelValue } from "@voter-file-tool/shared-validators";
import type { Session } from "next-auth";

async function removeCommitteeHandler(req: NextRequest, _session: Session) {
  const body = (await req.json()) as unknown;
  const validation = validateRequest(body, committeeDataSchema);

  if (!validation.success) {
    return validation.response;
  }

  const { cityTown, legDistrict, electionDistrict, memberId } = validation.data;

  // Convert undefined legDistrict to sentinel value for database storage
  const legDistrictForDb = toDbSentinelValue(legDistrict);

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
        { status: "error", error: "Committee not found" },
        { status: 404 },
      );
    }

    // Verify the member actually belongs to this committee before removal
    const memberToRemove = await prisma.voterRecord.findUnique({
      where: { VRCNUM: memberId },
      select: { committeeId: true },
    });

    if (!memberToRemove) {
      return NextResponse.json(
        { status: "error", error: "Member not found" },
        { status: 404 },
      );
    }

    if (memberToRemove.committeeId !== existingElectionDistrict.id) {
      return NextResponse.json(
        { status: "error", error: "Member does not belong to this committee" },
        { status: 400 },
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

    // Default fallback for all other errors
    return NextResponse.json(
      { status: "error", error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, removeCommitteeHandler);
