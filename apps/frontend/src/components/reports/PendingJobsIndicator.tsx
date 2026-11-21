"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { StatusBadge, type StatusTone } from "~/components/ui/status-badge";
import { Button } from "~/components/ui/button";
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { type Report, type JobStatus } from "@prisma/client";
import { formatReportType } from "./reportUtils";
import { useApiDelete } from "~/hooks/useApiMutation";
import { useHasMounted } from "~/hooks/useHasMounted";

const JOB_STATUS_BADGE: Record<JobStatus, { tone: StatusTone; label: string }> =
  {
    PENDING: { tone: "warning", label: "Pending" },
    PROCESSING: { tone: "info", label: "Processing" },
    COMPLETED: { tone: "success", label: "Completed" },
    FAILED: { tone: "danger", label: "Failed" },
  };

interface PendingJobsIndicatorProps {
  initialJobs?: Report[];
}

const PendingJobsIndicator: React.FC<PendingJobsIndicatorProps> = ({
  initialJobs = [],
}) => {
  const [jobs, setJobs] = useState<Report[]>(initialJobs);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);
  // Start times are formatted in the browser's time zone, which the server (UTC) doesn't know,
  // so they're left out of the server HTML and filled in after hydration.
  const hasMounted = useHasMounted();

  const deleteJobMutation = useApiDelete<{ success: boolean }, { id: string }>(
    "/api/reports",
    {
      onSuccess: (data, payload) => {
        if (payload?.id) {
          setJobs((prev) => prev.filter((job) => job.id !== payload.id));
        }
      },
      onError: (error) => {
        console.error("Error deleting report:", error);
      },
    },
  );

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "/api/reportJobs?status=pending,processing,failed&page=1&pageSize=5",
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch pending jobs (${response.status})`);
      }
      const data = (await response.json()) as {
        reports: Report[];
      };
      setJobs(data.reports || []);
    } catch (error) {
      console.error("Error fetching pending jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchJobs();
    const interval = setInterval(() => {
      void fetchJobs();
    }, 15 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-warning-solid" />;
      case "PROCESSING":
        return <Loader2 className="h-4 w-4 text-info-solid animate-spin" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-success-solid" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-danger-solid" />;
    }
  };

  const getJobName = (job: Report) => {
    if (job.title) {
      return job.title;
    } else {
      return `Unnamed ${formatReportType(job.ReportType)}`;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this failed report?")) {
      return;
    }

    setDeletingIds((prev) => new Set(prev).add(jobId));
    try {
      await deleteJobMutation.mutate({ id: jobId }, `/api/reports/${jobId}`);
    } catch {
      // handled by onError
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  const pendingJobs = jobs.filter(
    (job) =>
      job.status === "PENDING" ||
      job.status === "PROCESSING" ||
      job.status === "FAILED",
  );

  if (pendingJobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle as="h2" className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Pending Reports</span>
          </CardTitle>
          <CardDescription>No pending reports</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const numPending = pendingJobs.filter(
    (job) => job.status === "PENDING" || job.status === "PROCESSING",
  ).length;

  const numFailed = pendingJobs.filter((job) => job.status === "FAILED").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle as="h2" className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-warning-solid" />
            <span>Report Jobs</span>
            <Badge variant="secondary" hoverable={false}>
              {pendingJobs.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchJobs}
            disabled={
              loading || deleteJobMutation.loading || deletingIds.size > 0
            }
            className="flex items-center space-x-1"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
        <CardDescription>
          {`${numPending} report${numPending !== 1 ? "s" : ""} in progress.${numFailed > 0 ? ` ${numFailed} reports have failed.` : ""}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingJobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center space-x-3">
              {getStatusIcon(job.status)}
              <div>
                <p className="text-sm font-medium">
                  {`${job.status === "FAILED" ? "Failed" : job.status === "PROCESSING" ? "Processing" : "Pending"} report: ${getJobName(job)}`}
                </p>
                <p className="text-xs text-gray-500">
                  Started{hasMounted ? ` ${formatDate(job.requestedAt)}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <StatusBadge tone={JOB_STATUS_BADGE[job.status].tone}>
                {JOB_STATUS_BADGE[job.status].label}
              </StatusBadge>
              {job.status === "FAILED" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteJob(job.id)}
                  disabled={deletingIds.has(job.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                  title="Delete failed report"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PendingJobsIndicator;
