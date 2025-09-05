// app/api/report-jobs/status/route.ts
import { JobStatus } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { getPresignedReadUrl } from "~/lib/s3Utils";

export const GET = async (req: NextRequest) => {
  try {
    const jobId = req.nextUrl.searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId parameter" },
        { status: 400 },
      );
    }

    const job = await prisma.reportJob.findUnique({
      where: { id: jobId },
      include: { report: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    let url: string | undefined;

    if (job.status === JobStatus.COMPLETED && job.report?.fileKey) {
      try {
        const presignedUrl = await getPresignedReadUrl(job.report.fileKey);
        url = presignedUrl;
      } catch (error) {
        console.error("Error generating presigned URL:", error);
        url = undefined;
      }
    }

    return NextResponse.json({ status: job.status, url });
  } catch (err) {
    console.error("Error fetching job status:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
};
