"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { useToast } from "~/components/ui/use-toast";
import { ReportStatusTracker } from "~/app/components/ReportStatusTracker";
import { Accordion } from "~/components/ui/accordion";
import { mapCommitteesToReportShapeWithFields } from "../committees/committeeUtils";
import type { CommitteeWithMembers } from "../committees/committeeUtils";
import type { XLSXConfigFormData } from "./types";
import { DEFAULT_FORM_DATA } from "./types";
import { useFormValidation } from "./hooks/useFormValidation";
import { ErrorDisplay } from "./components/ErrorDisplay";
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

  const {
    errors,
    hasUserSubmitted,
    setHasUserSubmitted,
    validateForm,
    clearErrors,
  } = useFormValidation(formData);

  // Handle report completion
  const handleReportComplete = (_url: string) => {
    toast({
      description:
        "Document generated successfully! Download will start shortly.",
      duration: 5000,
    });
    // Trigger download
    // window.open(url, "_blank");
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
  };

  const handleFormDataChange = (updates: Partial<XLSXConfigFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Mark that user has attempted to submit the form
    setHasUserSubmitted(true);

    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);

    try {
      const committeeData = mapCommitteesToReportShapeWithFields(
        committeeLists,
        formData.selectedFields,
      );
      // Send committee data to backend

      const reportPayload = {
        type: "ldCommittees" as const,
        name: formData.name,
        description: formData.description,
        format: formData.format,
        payload: committeeData,
        includeFields: formData.selectedFields,
        xlsxConfig:
          formData.format === "xlsx"
            ? {
                includeCompoundFields: formData.includeCompoundFields,
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
        const errorData = (await response.json()) as { error?: string };
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
        <ErrorDisplay errors={errors} hasUserSubmitted={hasUserSubmitted} />

        <div className="flex justify-end space-x-2">
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
            disabled={isGenerating || Object.keys(errors).length > 0}
          >
            {isGenerating
              ? "Generating..."
              : `Generate ${formData.format.toUpperCase()}`}
          </Button>
        </div>
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
    </form>
  );
};
