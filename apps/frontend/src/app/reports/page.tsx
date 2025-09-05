import React from "react";
import AuthCheck from "~/components/ui/authcheck";
import ReportsList from "~/components/reports/ReportsList";
import PendingJobsIndicator from "~/components/reports/PendingJobsIndicator";
import prisma from "~/lib/prisma";
import { JobStatus, PrivilegeLevel } from "@prisma/client";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";

const ReportsPage: React.FC = async () => {
  const session = await auth();

  const isAdmin = session?.user?.privilegeLevel
    ? hasPermissionFor(session.user.privilegeLevel, PrivilegeLevel.Admin)
    : false;

  // Fetch initial pending jobs for the indicator
  const initialPendingJobs = session?.user?.id
    ? await prisma.reportJob.findMany({
        where: {
          requestedById: session.user.id,
          status: {
            in: [JobStatus.PENDING, JobStatus.PROCESSING],
          },
        },
        orderBy: { createdAt: "desc" },
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
          <PendingJobsIndicator initialJobs={initialPendingJobs} />

          {/* Reports Lists - Side by side with responsive layout */}
          <div className="flex flex-col xl:flex-row gap-6 overflow-hidden">
            <div className="flex-1 min-w-0">
              <ReportsList
                type="my-reports"
                title="My Reports"
                description="Reports you have generated"
                isAdmin={isAdmin}
              />
            </div>

            <div className="flex-1 min-w-0">
              <ReportsList
                type="public"
                title="Public Reports"
                description="Publicly available reports"
                isAdmin={isAdmin}
              />
            </div>
          </div>
        </div>
      </div>
    </AuthCheck>
  );
};

export default ReportsPage;
