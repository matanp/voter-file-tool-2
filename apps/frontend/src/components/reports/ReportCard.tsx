import React from "react";
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
  Download,
  Eye,
  Calendar,
  User,
  Edit2,
  Save,
  X,
  Trash2,
  Globe,
  Lock,
} from "lucide-react";
import { ReportType, type Report } from "@prisma/client";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { formatReportType } from "./reportUtils";

// Utility function to format file sizes in human-readable format
const formatFileSize = (bytes: number | null): string => {
  if (bytes === null || bytes === 0) return "Unknown size";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// Utility function to get file type from report data
const getFileType = (report: ReportCardProps["report"]): string => {
  // First try the fileType field from the database
  if (report.fileType) {
    return report.fileType.toUpperCase();
  }

  // Fallback to content type
  if (report.fileContentType) {
    if (report.fileContentType.includes("pdf")) return "PDF";
    if (
      report.fileContentType.includes("spreadsheet") ||
      report.fileContentType.includes("excel")
    )
      return "XLSX";
  }

  // Fallback to extracting from presigned URL
  if (report.presignedUrl) {
    try {
      const pathname = new URL(report.presignedUrl).pathname;
      const lastDotIndex = pathname.lastIndexOf(".");
      if (lastDotIndex !== -1 && lastDotIndex < pathname.length - 1) {
        return pathname.substring(lastDotIndex + 1).toUpperCase();
      }
    } catch (error) {
      console.warn("Failed to parse URL for file type:", error);
    }
  }

  return "Unknown";
};

interface ReportCardProps {
  report: Report & {
    generatedBy: {
      id: string;
      name: string | null;
      email: string;
    };
    presignedUrl?: string | null;
    fileSize?: number | null;
    fileContentType?: string | null;
  };
  canEdit?: boolean;
  canTogglePublic?: boolean;
  onUpdate?: (
    reportId: string,
    updates: { title?: string; description?: string; public?: boolean },
  ) => Promise<void>;
  onDelete?: (reportId: string) => Promise<void>;
}

const ReportCard: React.FC<ReportCardProps> = ({
  report,
  canEdit = false,
  canTogglePublic = false,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(report.title ?? "");
  const [editDescription, setEditDescription] = React.useState(
    report.description ?? "",
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const hasChanges = React.useMemo(() => {
    const originalTitle = report.title ?? "";
    const originalDescription = report.description ?? "";
    const newTitle = editTitle.trim() || "";
    const newDescription = editDescription.trim() || "";

    return newTitle !== originalTitle || newDescription !== originalDescription;
  }, [report.title, report.description, editTitle, editDescription]);
  const handleDownload = () => {
    if (!report.presignedUrl) {
      console.error("No presigned URL available for download");
      return;
    }

    // Extract file extension from presignedUrl, fallback to "pdf"
    const getFileExtension = (url: string): string => {
      try {
        const pathname = new URL(url).pathname;
        const lastDotIndex = pathname.lastIndexOf(".");
        if (lastDotIndex !== -1 && lastDotIndex < pathname.length - 1) {
          return pathname.substring(lastDotIndex + 1);
        }
      } catch (error) {
        console.warn("Failed to parse URL for file extension:", error);
      }
      return "pdf";
    };

    const fileExtension = getFileExtension(report.presignedUrl);
    const link = document.createElement("a");
    link.href = report.presignedUrl;
    link.download = `${report.title ?? "report"}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = () => {
    if (!report.presignedUrl) {
      console.error("No presigned URL available for viewing");
      return;
    }

    window.open(report.presignedUrl, "_blank");
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditTitle(report.title ?? "");
    setEditDescription(report.description ?? "");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditTitle(report.title ?? "");
    setEditDescription(report.description ?? "");
  };

  const handleSave = async () => {
    if (!onUpdate) return;

    // If no changes were made, just exit edit mode without API call
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(report.id, {
        title: editTitle.trim() || undefined,
        description: editDescription.trim() || undefined,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating report:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    if (
      !confirm(
        "Are you sure you want to delete this report? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(report.id);
    } catch (error) {
      console.error("Error deleting report:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublic = async () => {
    if (!onUpdate || !canTogglePublic) return;

    try {
      await onUpdate(report.id, { public: !report.public });
    } catch (error) {
      console.error("Error toggling public status:", error);
    }
  };

  const getReportTypeColor = (type: ReportType) => {
    switch (type) {
      case ReportType.CommitteeReport:
        return "bg-blue-100 text-blue-800";
      case ReportType.DesignatedPetition:
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Report title"
                  className="text-lg font-semibold"
                />
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Report description"
                  className="text-sm resize-none"
                  rows={2}
                />
              </div>
            ) : (
              <>
                <CardTitle className="text-lg">
                  {report.title ?? "Untitled Report"}
                </CardTitle>
                <CardDescription className="text-sm">
                  {report.description ?? "No description available"}
                </CardDescription>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Badge
              className={getReportTypeColor(report.ReportType)}
              hoverable={false}
            >
              {formatReportType(report.ReportType)}
            </Badge>
            {canTogglePublic && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleTogglePublic}
                className={`h-8 w-8 p-0 ${
                  report.public
                    ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
                title={report.public ? "Make private" : "Make public"}
              >
                {report.public ? (
                  <Globe className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </Button>
            )}
            {canEdit && (
              <div className="flex items-center space-x-1">
                {isEditing ? (
                  <>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="h-8 w-8 p-0"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEdit}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <User className="h-4 w-4" />
            <span>{report.generatedBy.name ?? report.generatedBy.email}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            {report.completedAt && (
              <span>{formatDate(report.completedAt)}</span>
            )}
          </div>
        </div>

        {/* File information */}
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <span className="font-medium">File type:</span>
            <Badge variant="outline" className="text-xs" hoverable={false}>
              {getFileType(report)}
            </Badge>
          </div>
          {report.fileSize && (
            <div className="flex items-center space-x-1">
              <span className="font-medium">Size:</span>
              <span>{formatFileSize(report.fileSize ?? null)}</span>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          {getFileType(report) !== "XLSX" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleView}
              className="flex items-center space-x-1"
            >
              <Eye className="h-4 w-4" />
              <span>View</span>
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={handleDownload}
            className="flex items-center space-x-1"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportCard;
