import { NextResponse, type NextRequest } from "next/server";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";

export interface HandleDiscrepancyRequest {
  VRCNUM: string;
  committeeId: number;
  accept: boolean;
  takeAddress: string;
}

async function handleCommitteeDiscrepancyHandler(
  req: NextRequest,
  _session: Session,
) {
  try {
    const { VRCNUM, accept, takeAddress } =
      (await req.json()) as HandleDiscrepancyRequest;

    if (!VRCNUM) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const discrepancy = await prisma.committeeUploadDiscrepancy.findUnique({
      where: {
        VRCNUM,
      },
      include: {
        committee: true,
      },
    });

    if (!discrepancy) {
      return NextResponse.json(
        { error: "Discrepancy not found" },
        { status: 404 },
      );
    }

    if (accept) {
      await prisma.committeeList.update({
        where: {
          cityTown_legDistrict_electionDistrict_termId: {
            cityTown: discrepancy.committee.cityTown,
            legDistrict: discrepancy.committee.legDistrict,
            electionDistrict: discrepancy.committee.electionDistrict,
            termId: discrepancy.committee.termId,
          },
        },
        data: {
          committeeMemberList: {
            connect: {
              VRCNUM,
            },
          },
        },
      });
    }

    if (takeAddress) {
      const record = await prisma.voterRecord.update({
        where: {
          VRCNUM,
        },
        data: {
          addressForCommittee: takeAddress,
        },
      });

      console.log(record);
    }

    await prisma.committeeUploadDiscrepancy.delete({
      where: {
        VRCNUM,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Discrepancy handled successfully",
        committee: discrepancy.committee,
      },
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

export const POST = withPrivilege(
  PrivilegeLevel.Admin,
  handleCommitteeDiscrepancyHandler,
);
