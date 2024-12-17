import prisma from "~/lib/prisma";
import { NextResponse } from "next/server";
import { CommitteeList } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const discrepanciesMap = await prisma.committeeUploadDiscrepancy.findMany({
      include: { committee: true },
    });

    const discrepanciesMapProcessed = discrepanciesMap.reduce<
      Record<
        string,
        {
          discrepancies: { incoming: string; existing: string };
          committee: CommitteeList;
        }
      >
    >((acc, { VRCNUM, discrepancy, committee }) => {
      acc[VRCNUM] = {
        discrepancies: discrepancy as { incoming: string; existing: string },
        committee,
      };
      return acc;
    }, {});

    const recordsWithDiscrepancies = await prisma.voterRecord.findMany({
      where: {
        OR: Object.keys(discrepanciesMapProcessed).map((voterId) => ({
          VRCNUM: voterId,
        })),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Discrepancies fetched and processed successfully",
        discrepanciesMap: Object.entries(discrepanciesMapProcessed),
        recordsWithDiscrepancies,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing discrepancies:", error);

    return NextResponse.json(
      { error: "Error processing discrepancies" },
      { status: 500 },
    );
  }
}
