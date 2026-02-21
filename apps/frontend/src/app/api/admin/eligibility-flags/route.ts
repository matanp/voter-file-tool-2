import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { eligibilityFlagsQuerySchema } from "~/lib/validations/eligibilityFlags";

async function getEligibilityFlagsHandler(
  req: NextRequest,
  _session: Session,
) {
  const { searchParams } = new URL(req.url);
  const queryInput = {
    status: searchParams.get("status") ?? undefined,
    reason: searchParams.get("reason") ?? undefined,
    termId: searchParams.get("termId") ?? undefined,
    committeeListId: searchParams.get("committeeListId") ?? undefined,
  };

  const validation = validateRequest(queryInput, eligibilityFlagsQuerySchema);
  if (!validation.success) {
    return validation.response;
  }

  const { status, reason, termId, committeeListId } = validation.data;

  try {
    const flags = await prisma.eligibilityFlag.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(reason ? { reason } : {}),
        ...(termId ? { termId } : {}),
        ...(committeeListId ? { committeeListId } : {}),
      },
      include: {
        membership: {
          select: {
            id: true,
            status: true,
            seatNumber: true,
            committeeListId: true,
            termId: true,
            voterRecordId: true,
            voterRecord: {
              select: {
                VRCNUM: true,
                firstName: true,
                lastName: true,
                party: true,
                stateAssmblyDistrict: true,
              },
            },
            committeeList: {
              select: {
                id: true,
                cityTown: true,
                legDistrict: true,
                electionDistrict: true,
              },
            },
            term: {
              select: {
                id: true,
                label: true,
              },
            },
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 500,
    });

    return NextResponse.json({ flags }, { status: 200 });
  } catch (error) {
    console.error("Failed to list eligibility flags:", error);
    return NextResponse.json(
      { error: "Failed to list eligibility flags" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getEligibilityFlagsHandler);
