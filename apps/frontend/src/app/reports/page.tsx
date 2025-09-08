import React from "react";
import AuthCheck from "~/components/ui/authcheck";
import ReportsList from "~/components/reports/ReportsList";
import PendingJobsIndicator from "~/components/reports/PendingJobsIndicator";
import prisma from "~/lib/prisma";
import { JobStatus } from "@prisma/client";
import { auth } from "~/auth";

export default async function ReportsPage() {
  const session = await auth();

  // Fetch initial pending reports for the indicator
  const initialPendingReports = session?.user?.id
    ? await prisma.report.findMany({
        where: {
          generatedById: session.user.id,
          deleted: false,
          status: {
            in: [JobStatus.PENDING, JobStatus.PROCESSING, JobStatus.FAILED],
          },
        },
        orderBy: { requestedAt: "desc" },
        take: 5,
      })
    : [];

  return (
    <AuthCheck>
      <div className="w-full p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Reports Dashboard
            </h1>
            <p className="text-muted-foreground">
              View and manage your reports and report generation jobs
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Report Jobs - Always at the top */}
          <PendingJobsIndicator initialJobs={initialPendingReports} />

          {/* Reports Lists - Side by side with responsive layout */}
          <div className="flex flex-col xl:flex-row gap-6 overflow-hidden">
            <div className="flex-1 min-w-0">
              <ReportsList
                type="my-reports"
                title="My Reports"
                description="Reports you have generated"
              />
            </div>

            <div className="flex-1 min-w-0">
              <ReportsList
                type="public"
                title="Public Reports"
                description="Publicly available reports"
              />
            </div>
          </div>
        </div>
      </div>
    </AuthCheck>
  );
}
