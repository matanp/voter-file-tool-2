// app/api/report-jobs/status/route.ts
import { JobStatus, PrivilegeLevel } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { getPresignedReadUrl } from "~/lib/s3Utils";
import { withPrivilege } from "../lib/withPrivilege";

export const GET = withPrivilege(
  PrivilegeLevel.RequestAccess,
  async (req: NextRequest) => {
    try {
      const jobId = req.nextUrl.searchParams.get("jobId");
      if (!jobId) {
        return NextResponse.json(
          { error: "Missing jobId parameter" },
          { status: 400 },
        );
      }

      const report = await prisma.report.findUnique({
        where: { id: jobId },
      });

      if (!report) {
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 },
        );
      }

      let url: string | undefined;

      if (report.status === JobStatus.COMPLETED && report.fileKey) {
        try {
          const presignedUrl = await getPresignedReadUrl(report.fileKey);
          url = presignedUrl;
        } catch (error) {
          console.error("Error generating presigned URL:", error);
          url = undefined;
        }
      }

      return NextResponse.json({
        status: report.status,
        url: url ?? null,
      });
    } catch (err) {
      console.error("Error fetching job status:", err);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  },
);
