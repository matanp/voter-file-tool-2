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
import { Clock, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { JobStatus, type ReportJob } from "@prisma/client";

interface PendingJobsIndicatorProps {
  initialJobs?: ReportJob[];
}

const PendingJobsIndicator: React.FC<PendingJobsIndicatorProps> = ({
  initialJobs = [],
}) => {
  const [jobs, setJobs] = useState<ReportJob[]>(initialJobs);
  const [loading, setLoading] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/reportJobs?status=pending,processing");
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Error fetching pending jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case JobStatus.PENDING:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case JobStatus.PROCESSING:
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case JobStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case JobStatus.FAILED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case JobStatus.PENDING:
        return "bg-yellow-100 text-yellow-800";
      case JobStatus.PROCESSING:
        return "bg-blue-100 text-blue-800";
      case JobStatus.COMPLETED:
        return "bg-green-100 text-green-800";
      case JobStatus.FAILED:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const pendingJobs = jobs.filter(
    (job) =>
      job.status === JobStatus.PENDING || job.status === JobStatus.PROCESSING,
  );

  if (pendingJobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Report Jobs</span>
          </CardTitle>
          <CardDescription>No pending report jobs</CardDescription>
        </CardHeader>
      </Card>
    );
  }

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
          {pendingJobs.length} job{pendingJobs.length !== 1 ? "s" : ""} in
          progress
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
                <p className="text-sm font-medium">Job #{job.id.slice(-8)}</p>
                <p className="text-xs text-gray-500">
                  Started {formatDate(job.createdAt)}
                </p>
              </div>
            </div>
            <Badge className={getStatusColor(job.status)} hoverable={false}>
              {job.status.toLowerCase()}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PendingJobsIndicator;
