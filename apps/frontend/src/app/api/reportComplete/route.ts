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

    const existingReport = await prisma.report.findUnique({
      where: { id: jobId },
      select: { status: true },
    });

    if (!existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (existingReport.status !== JobStatus.PROCESSING) {
      console.warn(
        `Report ${jobId} is not in PROCESSING status (current: ${existingReport.status})`,
      );
    }

    if (success) {
      if (!url) {
        throw new Error("successful job but no url");
      }

      await prisma.report.update({
        where: {
          id: jobId,
        },
        data: {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
          fileKey: url,
        },
      });

      return NextResponse.json({ received: true }, { status: 200 });
    } else {
      console.error("Job failed:", error);

      await prisma.report.update({
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
