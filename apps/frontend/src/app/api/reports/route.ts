import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { auth } from "~/auth";
import { getPresignedReadUrl, getFileMetadata } from "~/lib/s3Utils";
import { JobStatus } from "@prisma/client";

export const GET = async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // "public", "my-reports", or "all"

    // Parse and validate pagination parameters
    const MAX_PAGE_SIZE = 100;
    const pageParam = url.searchParams.get("page") ?? "1";
    const pageSizeParam = url.searchParams.get("pageSize") ?? "10";

    const parsedPage = parseInt(pageParam, 10);
    const parsedPageSize = parseInt(pageSizeParam, 10);

    // Validate and clamp values to prevent invalid pagination
    const page = Number.isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);
    const pageSize = Number.isNaN(parsedPageSize)
      ? 10
      : Math.min(MAX_PAGE_SIZE, Math.max(1, parsedPageSize));

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

    // Generate presigned URLs and file metadata for each report
    const reportsWithUrls = await Promise.all(
      reports.map(async (report) => {
        try {
          const [presignedUrl, fileMetadata] = await Promise.all([
            report.fileKey ? getPresignedReadUrl(report.fileKey) : null,
            report.fileKey ? getFileMetadata(report.fileKey) : null,
          ]);

          return {
            ...report,
            presignedUrl,
            fileSize: fileMetadata?.size ?? null,
            fileContentType: fileMetadata?.contentType ?? null,
          };
        } catch (error) {
          console.error(
            `Error generating presigned URL for report ${report.id}:`,
            error,
          );
          return {
            ...report,
            presignedUrl: null,
            fileSize: null,
            fileContentType: null,
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
