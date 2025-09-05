import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { auth } from "~/auth";
import { type JobStatus } from "@prisma/client";

export const GET = async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // "pending", "processing", "completed", "failed", or "all"
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") ?? "10");

    const whereClause: {
      requestedById: string;
      status?: JobStatus | { in: JobStatus[] };
    } = {
      requestedById: session.user.id,
    };

    if (status && status !== "all") {
      const statusValues = status
        .split(",")
        .map((s) => s.trim().toUpperCase() as JobStatus);
      whereClause.status =
        statusValues.length === 1 ? statusValues[0] : { in: statusValues };
    }

    const [jobs, totalCount] = await Promise.all([
      prisma.reportJob.findMany({
        where: whereClause,
        include: {
          report: {
            select: {
              id: true,
              title: true,
              description: true,
              ReportType: true,
              fileType: true,
              public: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.reportJob.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      jobs,
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
};
