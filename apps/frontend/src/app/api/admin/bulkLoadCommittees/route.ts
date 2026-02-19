import prisma from "~/lib/prisma";
import { NextResponse } from "next/server";
import { loadCommitteeLists } from "./bulkLoadUtils";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

async function bulkLoadCommitteesHandler(
  _req: NextRequest,
  session: Session,
) {
  try {
    if (process.env.VERCEL) {
      return NextResponse.json({ error: "Not available in this environment" });
    }

    let activeTermId: string;
    try {
      activeTermId = await getActiveTermId();
    } catch {
      return NextResponse.json(
        { error: "No active committee term. Create one in Admin > Terms first." },
        { status: 503 },
      );
    }

    await prisma.committeeUploadDiscrepancy.deleteMany({});

    const discrepanciesMap = await loadCommitteeLists({
      userId: session.user?.id ?? "system",
      userRole: session.user?.privilegeLevel ?? PrivilegeLevel.Admin,
    });

    const transactionOperations = Array.from(discrepanciesMap.entries()).map(
      ([voterId, discrepancyAndCommittee]) =>
        prisma.committeeUploadDiscrepancy.create({
          data: {
            VRCNUM: voterId,
            discrepancy: discrepancyAndCommittee.discrepancies,
            committee: {
              connect: {
                cityTown_legDistrict_electionDistrict_termId: {
                  cityTown: discrepancyAndCommittee.committee.cityTown,
                  legDistrict: discrepancyAndCommittee.committee.legDistrict,
                  electionDistrict:
                    discrepancyAndCommittee.committee.electionDistrict,
                  termId: activeTermId,
                },
              },
            },
          },
        }),
    );

    await prisma.$transaction(transactionOperations);

    const recordsWithDiscrepancies = await prisma.voterRecord.findMany({
      where: {
        OR: Array.from(discrepanciesMap.entries()).map(([key]) => ({
          VRCNUM: key,
        })),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Committee lists loaded successfully",
        discrepanciesMap: Array.from(discrepanciesMap.entries()),
        recordsWithDiscrepancies,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error loading committee lists:", error);

    return NextResponse.json(
      { error: "Error loading committee lists" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.Admin,
  bulkLoadCommitteesHandler,
);
