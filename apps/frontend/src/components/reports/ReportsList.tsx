"use client";

import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ReportCard from "./ReportCard";
import { type Report, PrivilegeLevel } from "@prisma/client";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import { useApiPatch, useApiDelete } from "~/hooks/useApiMutation";

interface ReportsListProps {
  type: "public" | "my-reports";
  title: string;
  description: string;
}

interface ReportsResponse {
  reports: (Report & {
    generatedBy: {
      id: string;
      name: string | null;
      email: string;
    };
    presignedUrl?: string | null;
  })[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ReportsList: React.FC<ReportsListProps> = ({
  type,
  title,
  description,
}) => {
  const { actingPermissions } = useContext(GlobalContext);
  const isAdmin = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);
  const [reports, setReports] = useState<ReportsResponse["reports"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // API mutation hooks
  const updateReportMutation = useApiPatch<
    Report,
    { title?: string; description?: string; public?: boolean }
  >(`/api/reports`, {
    onSuccess: () => {
      // Refresh the current page to show updated data
      void fetchReports(page, true);
    },
    onError: (error) => {
      console.error("Error updating report:", error);
    },
  });

  const deleteReportMutation = useApiDelete<Report, void>(`/api/reports`, {
    onSuccess: () => {
      // Refresh the current page to show updated data
      void fetchReports(page, true);
    },
    onError: (error) => {
      console.error("Error deleting report:", error);
    },
  });

  const fetchReports = useCallback(
    async (pageNum = 1, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetch(
          `/api/reports?type=${type}&page=${pageNum}&pageSize=5`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch reports");
        }

        const data = (await response.json()) as unknown as ReportsResponse;
        setReports(data.reports);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
        setPage(data.page);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [type],
  );

  useEffect(() => {
    void fetchReports(1);
  }, [fetchReports, type]);

  const handleRefresh = () => {
    void fetchReports(page, true);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      void fetchReports(newPage);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages around current page
      const start = Math.max(1, page - 2);
      const end = Math.min(totalPages, start + maxVisiblePages - 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const handleUpdateReport = async (
    reportId: string,
    updates: { title?: string; description?: string; public?: boolean },
  ) => {
    void updateReportMutation.mutate(updates, `/api/reports/${reportId}`);
  };

  const handleDeleteReport = async (reportId: string) => {
    void deleteReportMutation.mutate(undefined, `/api/reports/${reportId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span>{title}</span>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {description} • {totalCount} total report
              {totalCount !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No reports found</p>
          </div>
        ) : (
          <>
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                canEdit={type === "my-reports"}
                canTogglePublic={isAdmin}
                onUpdate={
                  type === "my-reports" || isAdmin
                    ? handleUpdateReport
                    : undefined
                }
                onDelete={
                  type === "my-reports" ? handleDeleteReport : undefined
                }
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="text-sm text-gray-500">
                  Showing page {page} of {totalPages}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="flex items-center space-x-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </Button>

                  <div className="flex items-center space-x-1">
                    {getPageNumbers().map((pageNum) => (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="flex items-center space-x-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportsList;
