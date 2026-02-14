import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { JobStatus } from "@prisma/client";
import { withPrivilege, type SessionWithUser } from "~/app/api/lib/withPrivilege";

// Helper function to validate and clamp pagination parameters
function validatePaginationParams(
  pageParam: string | null,
  pageSizeParam: string | null,
  totalCount?: number,
) {
  // Parse page with fallback to 1
  let page = parseInt(pageParam ?? "1", 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  // Parse pageSize with fallback to 10
  let pageSize = parseInt(pageSizeParam ?? "10", 10);
  if (isNaN(pageSize) || pageSize < 1) {
    pageSize = 10;
  }

  // Cap pageSize to reasonable maximum
  const maxPageSize = 100;
  if (pageSize > maxPageSize) {
    pageSize = maxPageSize;
  }

  // Cap page to reasonable maximum if totalCount is available
  if (totalCount !== undefined) {
    const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));
    if (page > maxPage) {
      page = maxPage;
    }
  } else {
    // Cap page to a reasonable maximum even without totalCount
    const maxPage = 10000; // Reasonable upper limit
    if (page > maxPage) {
      page = maxPage;
    }
  }

  return { page, pageSize };
}

/** Handles GET requests to list report jobs for the current session/user, applies pagination and filtering, and returns job metadata. */
async function getReportJobsHandler(req: NextRequest, session: SessionWithUser) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // "pending", "processing", "completed", "failed", or "all"
    const pageParam = url.searchParams.get("page");
    const pageSizeParam = url.searchParams.get("pageSize");

    const whereClause: {
      generatedById: string;
      deleted: boolean;
      status?: JobStatus | { in: JobStatus[] };
    } = {
      generatedById: session.user.id,
      deleted: false,
    };

    if (status && status !== "all") {
      // Define valid JobStatus values
      const validStatuses = new Set(Object.values(JobStatus));
      // Parse and validate status values
      const statusValues = status
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => validStatuses.has(s as JobStatus));

      // If no valid statuses found, return 400 Bad Request
      if (statusValues.length === 0) {
        return NextResponse.json(
          {
            error:
              "Invalid status values. Valid values are: " +
              Array.from(validStatuses).join(", "),
            provided: status,
          },
          { status: 400 },
        );
      }

      whereClause.status =
        statusValues.length === 1
          ? (statusValues[0] as JobStatus)
          : { in: statusValues as JobStatus[] };
    }

    // Get total count first to validate pagination parameters
    const totalCount = await prisma.report.count({
      where: whereClause,
    });

    // Validate and clamp pagination parameters
    const { page, pageSize } = validatePaginationParams(
      pageParam,
      pageSizeParam,
      totalCount,
    );

    // Calculate skip value, ensuring it's not negative
    const skip = Math.max(0, (page - 1) * pageSize);

    const reports = await prisma.report.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        description: true,
        ReportType: true,
        fileType: true,
        public: true,
        status: true,
        requestedAt: true,
        completedAt: true,
      },
      orderBy: { requestedAt: "desc" },
      skip,
      take: pageSize,
    });

    return NextResponse.json({
      reports,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    console.error("Error fetching report jobs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege("Authenticated", getReportJobsHandler);
