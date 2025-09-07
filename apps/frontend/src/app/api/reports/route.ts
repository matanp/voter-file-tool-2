import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { auth } from "~/auth";
import { getPresignedReadUrl } from "~/lib/s3Utils";
import { JobStatus } from "@prisma/client";

export const GET = async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // "public", "my-reports", or "all"
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") ?? "10");

    let whereClause: {
      deleted: boolean;
      public?: boolean;
      generatedById?: string;
      status?: JobStatus;
    } = { deleted: false };

    if (type === "public") {
      whereClause = { ...whereClause, public: true };
    } else if (type === "my-reports") {
      whereClause = {
        ...whereClause,
        generatedById: session.user.id,
        status: JobStatus.COMPLETED, // Only show completed reports in My Reports
      };
    }
    // If type is "all" or not specified, we don't add any additional filters beyond deleted: false

    const [reports, totalCount] = await Promise.all([
      prisma.report.findMany({
        where: whereClause,
        include: {
          generatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { requestedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.report.count({
        where: whereClause,
      }),
    ]);

    // Generate presigned URLs for each report
    const reportsWithUrls = await Promise.all(
      reports.map(async (report) => {
        try {
          const presignedUrl = report.fileKey
            ? await getPresignedReadUrl(report.fileKey)
            : null;
          return {
            ...report,
            presignedUrl,
          };
        } catch (error) {
          console.error(
            `Error generating presigned URL for report ${report.id}:`,
            error,
          );
          return {
            ...report,
            presignedUrl: null,
          };
        }
      }),
    );

    return NextResponse.json({
      reports: reportsWithUrls,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
};
