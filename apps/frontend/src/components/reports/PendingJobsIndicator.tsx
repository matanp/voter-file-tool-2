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
import { Button } from "~/components/ui/button";
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { type Report, JobStatus } from "@prisma/client";
import { formatReportType } from "./reportUtils";

interface PendingJobsIndicatorProps {
  initialJobs?: Report[];
}

const PendingJobsIndicator: React.FC<PendingJobsIndicatorProps> = ({
  initialJobs = [],
}) => {
  const [jobs, setJobs] = useState<Report[]>(initialJobs);
  const [loading, setLoading] = useState(false);
  const [deletingJobs, setDeletingJobs] = useState<Set<string>>(new Set());

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "/api/reportJobs?status=pending,processing,failed&page=1&pageSize=5",
      );
      const data = (await response.json()) as unknown as {
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
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "PROCESSING":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "PROCESSING":
        return "bg-blue-100 text-blue-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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

    setDeletingJobs((prev) => new Set(prev).add(jobId));
    try {
      const response = await fetch(`/api/reports/${jobId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete report");
      }

      // Remove the job from the list
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
    } catch (error) {
      console.error("Error deleting report:", error);
    } finally {
      setDeletingJobs((prev) => {
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
          <CardTitle className="flex items-center space-x-2">
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
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <span>Report Jobs</span>
            <Badge variant="secondary" hoverable={false}>
              {pendingJobs.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchJobs}
            disabled={loading}
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
                  Started {formatDate(job.requestedAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(job.status)} hoverable={false}>
                {job.status.toLowerCase()}
              </Badge>
              {job.status === "FAILED" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteJob(job.id)}
                  disabled={deletingJobs.has(job.id)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
