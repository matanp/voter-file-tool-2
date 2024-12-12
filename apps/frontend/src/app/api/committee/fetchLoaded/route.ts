import prisma from "~/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const discrepanciesMap = await prisma.committeeUploadDiscrepancy.findMany();

    const discrepanciesMapProcessed = discrepanciesMap.reduce<
      Record<string, { incoming: string; existing: string }>
    >((acc, { VRCNUM, discrepancy }) => {
      acc[VRCNUM] = discrepancy as { incoming: string; existing: string };
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
