"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { useToast } from "~/components/ui/use-toast";
import { ReportStatusTracker } from "~/app/components/ReportStatusTracker";
import { Accordion } from "~/components/ui/accordion";
import { mapCommitteesToReportShapeWithFields } from "../committees/committeeUtils";
import type { CommitteeWithMembers } from "../committees/committeeUtils";
import type { XLSXConfigFormData } from "./types";
import { DEFAULT_FORM_DATA } from "./types";
import { useFormValidation } from "./hooks/useFormValidation";
import { ErrorDisplay } from "~/components/ErrorDisplay";
import { ReportInfo } from "./components/ReportInfo";
import { FieldSelection } from "./components/FieldSelection";
import { XLSXConfig } from "./components/XLSXConfig";

interface XLSXConfigFormProps {
  committeeLists: CommitteeWithMembers[];
}

export const XLSXConfigForm: React.FC<XLSXConfigFormProps> = ({
  committeeLists,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] =
    useState<XLSXConfigFormData>(DEFAULT_FORM_DATA);
  const [reportId, setReportId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  const {
    errors,
    hasUserSubmitted,
    setHasUserSubmitted,
    validateForm,
    clearErrors,
    clearErrorTracking,
    hadErrorsSinceLastSubmit,
  } = useFormValidation(formData);

  // Handle report completion
  const handleReportComplete = (url: string) => {
    toast({
      description: formData.autoDownload
        ? "Document generated successfully! Download will start shortly."
        : "Document generated successfully! You can download it from the reports page.",
      duration: 5000,
    });

    // For PDF reports, show in iframe; for XLSX, respect auto-download setting
    if (formData.format === "pdf") {
      setReportUrl(url);
    } else if (formData.autoDownload) {
      // Force direct download for XLSX files when auto-download is enabled
      const link = document.createElement("a");
      link.href = url;
      link.download = ""; // This forces download instead of navigation
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setIsGenerating(false);
    setReportId(null);
  };

  // Handle report error
  const handleReportError = (errorMessage: string) => {
    toast({
      variant: "destructive",
      title: "Generation Failed",
      description: errorMessage || "Failed to generate document",
      duration: 5000,
    });
    setIsGenerating(false);
    setReportId(null);
  };

  const clearForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    clearErrors();
    setReportId(null);
    setIsGenerating(false);
    setReportUrl(null);
  };

  const handleFormDataChange = (updates: Partial<XLSXConfigFormData>) => {
    setFormData((prev) => {
      const newData = { ...prev, ...updates };
      return newData;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setHasUserSubmitted(true);

    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);
    clearErrorTracking(); // Clear error tracking when report generation starts

    try {
      const committeeData = mapCommitteesToReportShapeWithFields(
        committeeLists,
        formData.includeFields,
      );

      const includeCompoundFields =
        formData.format === "pdf"
          ? {
              name: true,
              address: true,
            }
          : formData.includeCompoundFields;

      const reportPayload = {
        type: "ldCommittees" as const,
        name: formData.name,
        description: formData.description,
        format: formData.format,
        payload: committeeData,
        includeFields: formData.includeFields,
        includeCompoundFields,
        xlsxConfig:
          formData.format === "xlsx"
            ? {
                includeCompoundFields,
                columnOrder:
                  formData.columnOrder.length > 0
                    ? formData.columnOrder
                    : undefined,
                columnHeaders:
                  Object.keys(formData.columnHeaders).length > 0
                    ? formData.columnHeaders
                    : undefined,
              }
            : undefined,
      };

      const response = await fetch("/api/generateReport", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reportPayload),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as {
          error?: string;
          issues?: string;
        };
        throw new Error(errorData.error ?? "Failed to generate report");
      }

      const responseData = (await response.json()) as { reportId: string };
      setReportId(responseData.reportId);

      toast({
        description: `Generating ${formData.format.toUpperCase()} document...`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate document",
        duration: 5000,
      });
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-none">
      <Accordion
        type="multiple"
        defaultValue={["report-info", "field-selection"]}
        className="w-full space-y-4"
      >
        <ReportInfo
          formData={formData}
          onFormDataChange={handleFormDataChange}
          errors={errors}
        />

        {formData.format === "xlsx" && (
          <FieldSelection
            formData={formData}
            onFormDataChange={handleFormDataChange}
            errors={errors}
          />
        )}

        {formData.format === "xlsx" && (
          <XLSXConfig
            formData={formData}
            onFormDataChange={handleFormDataChange}
          />
        )}
      </Accordion>

      {/* Submit Button */}
      <div className="space-y-2">
        <ErrorDisplay
          errors={errors}
          hasUserSubmitted={hasUserSubmitted}
          hadErrorsSinceLastSubmit={hadErrorsSinceLastSubmit}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {formData.format === "xlsx" && (
              <>
                <Switch
                  id="autoDownload"
                  checked={formData.autoDownload}
                  onCheckedChange={(checked) =>
                    handleFormDataChange({ autoDownload: checked })
                  }
                />
                <Label htmlFor="autoDownload" className="text-sm font-medium">
                  Auto-download
                </Label>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2 text-right">
            <Button
              type="button"
              variant="outline"
              onClick={clearForm}
              disabled={isGenerating}
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={
                isGenerating ||
                (hasUserSubmitted && Object.keys(errors).length > 0)
              }
            >
              {isGenerating
                ? "Generating..."
                : `Generate ${formData.format.toUpperCase()}`}
            </Button>
          </div>
        </div>
        {formData.format === "xlsx" && (
          <p className="text-xs text-muted-foreground">
            {formData.autoDownload ? (
              "File will download automatically"
            ) : (
              <>
                Find your report in the{" "}
                <a
                  href="/reports"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Reports page
                </a>
              </>
            )}
          </p>
        )}
      </div>

      {/* Status Display */}
      {isGenerating && (
        <div className="bg-primary-foreground p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Generating document...</span>
          </div>
        </div>
      )}

      {/* Report Status Tracker */}
      {reportId && (
        <ReportStatusTracker
          reportId={reportId}
          onComplete={handleReportComplete}
          onError={handleReportError}
        />
      )}

      {/* PDF Report Display */}
      {reportUrl && formData.format === "pdf" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 py-2">
            <p className="font-medium">PDF report generated successfully!</p>
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              Open in New Tab
            </a>
          </div>
          <iframe
            className="w-full h-[100vh] max-w-[800px] max-h-[1200px] border rounded-lg"
            src={reportUrl}
            title="Generated PDF Report"
          />
        </div>
      )}
    </form>
  );
};
