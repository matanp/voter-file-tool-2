"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { useToast } from "~/components/ui/use-toast";
import { ReportStatusTracker } from "~/app/components/ReportStatusTracker";
import { Accordion } from "~/components/ui/accordion";
import type { XLSXConfigFormData } from "./types";
import { DEFAULT_FORM_DATA } from "./types";
import { useFormValidation } from "./hooks/useFormValidation";
import { ErrorDisplay } from "~/components/ErrorDisplay";
import { ReportInfo } from "./components/ReportInfo";
import { FieldSelection } from "./components/FieldSelection";
import { XLSXConfig } from "./components/XLSXConfig";
import { useApiMutation } from "~/hooks/useApiMutation";
import type { GenerateReportData } from "@voter-file-tool/shared-validators";

export const XLSXConfigForm: React.FC = () => {
  const { toast } = useToast();
  const [formData, setFormData] =
    useState<XLSXConfigFormData>(DEFAULT_FORM_DATA);
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  // API mutation hook
  const generateReportMutation = useApiMutation<
    { reportId: string },
    GenerateReportData
  >("/api/generateReport", "POST", {
    onSuccess: (data) => {
      setReportId(data.reportId);
      toast({
        title: "Report Generation Started",
        description:
          "Your report is being generated. You'll be notified when it's ready.",
      });
    },
    onError: (error) => {
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Unknown error";
      toast({
        title: "Error",
        description: `Failed to generate report: ${msg}`,
        variant: "destructive",
      });
    },
  });

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
    setReportId(null);
  };

  const clearForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    clearErrors();
    setReportId(null);
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

    clearErrorTracking(); // Clear error tracking when report generation starts

    try {
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
        includeFields: formData.includeFields,
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

      await generateReportMutation.mutate(reportPayload);
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
              disabled={generateReportMutation.loading}
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={
                generateReportMutation.loading ||
                (hasUserSubmitted && Object.keys(errors).length > 0)
              }
            >
              {generateReportMutation.loading
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
      {generateReportMutation.loading && (
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
