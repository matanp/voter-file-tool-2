import prisma from "~/lib/prisma";
import { loadCommitteeLists } from "../../bulkLoadData/route";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const discrepanciesMap = await loadCommitteeLists();

    const transactionOperations = Array.from(discrepanciesMap.entries()).map(
      ([voterId, discrepancyAndCommittee]) =>
        prisma.committeeUploadDiscrepancy.create({
          data: {
            VRCNUM: voterId,
            discrepancy: discrepancyAndCommittee.discrepancies,
            committee: {
              connect: {
                cityTown_legDistrict_electionDistrict: {
                  cityTown: discrepancyAndCommittee.committee.cityTown,
                  legDistrict: discrepancyAndCommittee.committee.legDistrict,
                  electionDistrict:
                    discrepancyAndCommittee.committee.electionDistrict,
                },
              },
            },
          },
        }),
    );

    await prisma.$transaction(transactionOperations);

    const recordsWithDiscrepancies = await prisma.voterRecord.findMany({
      where: {
        OR: Array.from(discrepanciesMap.entries()).map(([key, value]) => ({
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
