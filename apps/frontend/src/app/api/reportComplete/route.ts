import { JobStatus, ReportType } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";

export const POST = async (req: NextRequest) => {
  try {
    const body = (await req.json()) as unknown;

    // TODO: type check with zod
    const { success, jobId, type, url, error } = body as {
      success: boolean;
      jobId: string;
      type?: string;
      url?: string;
      error?: string;
    };

    if (success) {
      if (!url) {
        throw new Error("successful job but no url");
      }

      // maybe make these atomic later
      const reportJob = await prisma.reportJob.update({
        where: {
          id: jobId,
        },
        data: {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      const report = await prisma.report.create({
        data: {
          generatedById: reportJob.requestedById,
          ReportType:
            type === "ldCommittees"
              ? ReportType.CommitteeReport
              : ReportType.DesignatedPetition,
          fileKey: url,
          title: (reportJob as { name?: string }).name ?? null,
          description:
            (reportJob as { description?: string }).description ?? null,
        },
      });

      await prisma.reportJob.update({
        where: { id: jobId },
        data: { reportId: report.id },
      });

      return NextResponse.json({ received: true }, { status: 200 });
    } else {
      console.error("Job failed:", error);

      await prisma.reportJob.update({
        where: {
          id: jobId,
        },
        data: {
          status: JobStatus.FAILED,
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Error in report complete endpoint:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
};
