"use client";
import React, { useState, useCallback, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { VoterRecordTable } from "../recordsearch/VoterRecordTable";
import { FieldSelection } from "../committee-reports/components/FieldSelection";
import { XLSXConfig } from "../committee-reports/components/XLSXConfig";
import { useFormValidation } from "../committee-reports/hooks/useFormValidation";
import { ErrorDisplay } from "~/components/ErrorDisplay";
import type {
  VoterRecordField,
  VoterRecordAPI,
} from "@voter-file-tool/shared-validators";
import { voterRecordSchema } from "@voter-file-tool/shared-validators";
import type { VoterRecord } from "@prisma/client";
import type { XLSXConfigFormData } from "../committee-reports/types";
import { useToast } from "~/components/ui/use-toast";
import { useVoterSearch } from "~/contexts/VoterSearchContext";
import {
  MAX_RECORDS_FOR_EXPORT,
  ADMIN_CONTACT_INFO,
  type GenerateReportData,
  type SearchQueryField,
  normalizeSearchQuery,
} from "@voter-file-tool/shared-validators";
import { ReportStatusTracker } from "~/app/components/ReportStatusTracker";
import { useApiMutation } from "~/hooks/useApiMutation";
import { ZodError } from "zod";
import { parseCalendarDate } from "~/lib/dateUtils";
import { SearchQueryDisplay } from "~/components/search/SearchQueryDisplay";

// Utility function to convert API records back to Prisma format for display
const convertAPIToPrismaRecord = (apiRecord: VoterRecordAPI): VoterRecord => {
  // Validate required fields upfront
  if (!apiRecord.VRCNUM) {
    throw new Error("Missing required field: VRCNUM");
  }
  if (
    apiRecord.latestRecordEntryYear === undefined ||
    apiRecord.latestRecordEntryYear === null
  ) {
    throw new Error("Missing required field: latestRecordEntryYear");
  }
  if (
    apiRecord.latestRecordEntryNumber === undefined ||
    apiRecord.latestRecordEntryNumber === null
  ) {
    throw new Error("Missing required field: latestRecordEntryNumber");
  }

  // Helper function to safely convert date strings to Date or null
  const convertDateString = (
    dateString: string | null | undefined,
  ): Date | null => {
    if (!dateString) return null;

    const date = parseCalendarDate(dateString);
    if (!date) return null;

    const currentYear = new Date().getFullYear();
    const minYear = 1900; // Reasonable minimum year for voter records
    const maxYear = currentYear + 1; // Allow up to next year for future registrations

    const year = date.getFullYear();
    if (year < minYear || year > maxYear) {
      console.warn(
        `Date ${dateString} is outside reasonable bounds (${minYear}-${maxYear})`,
      );
      return null;
    }

    return date;
  };

  // First validate the API record structure using Zod schema
  const apiValidationResult = voterRecordSchema.safeParse(apiRecord);

  if (!apiValidationResult.success) {
    console.error(
      "VoterRecordAPI validation failed:",
      apiValidationResult.error,
    );
    throw new Error(
      `Invalid API voter record data: ${apiValidationResult.error.message}`,
    );
  }

  // Create the Prisma record by spreading the validated API record and handling special cases
  const prismaRecord = {
    ...apiValidationResult.data,
    // Convert date strings to Date objects
    DOB: convertDateString(apiRecord.DOB),
    lastUpdate: convertDateString(apiRecord.lastUpdate),
    originalRegDate: convertDateString(apiRecord.originalRegDate),
  };

  // Remove API-only computed fields that don't exist in the Prisma model
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hasDiscrepancy, ...prismaRecordWithoutComputedFields } = prismaRecord;

  return prismaRecordWithoutComputedFields as VoterRecord;
};

type VoterListReportFormProps = Record<string, never>;

interface VoterListReportFormData {
  name: string;
  description: string;
  format: "xlsx";
  includeFields: VoterRecordField[];
  includeCompoundFields: {
    name: boolean;
    address: boolean;
  };
  columnOrder: string[];
  columnHeaders: Record<string, string>;
  autoDownload: boolean;
}

export const VoterListReportForm: React.FC<VoterListReportFormProps> = () => {
  const { flattenedSearchQuery, clearSearchQuery } = useVoterSearch();

  const [searchResults, setSearchResults] = useState<VoterRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [reportId, setReportId] = useState<string | null>(null);
  const { toast } = useToast();

  // Store toast in ref to avoid dependency issues
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [formData, setFormData] = useState<VoterListReportFormData>({
    name: "",
    description: "",
    format: "xlsx",
    includeFields: [],
    includeCompoundFields: {
      name: true,
      address: true,
    },
    columnOrder: [],
    columnHeaders: {},
    autoDownload: true,
  });

  const {
    errors,
    hasUserSubmitted,
    setHasUserSubmitted,
    validateForm,
    clearErrorTracking,
    hadErrorsSinceLastSubmit,
  } = useFormValidation(formData);

  const handleFetchDataSuccess = useCallback(
    (data: { data: VoterRecordAPI[]; totalRecords: number }) => {
      const convertedRecords = data.data.map(convertAPIToPrismaRecord);
      setSearchResults(convertedRecords);
      setTotalRecords(data.totalRecords);
    },
    [],
  );

  const handleFetchDataError = useCallback((error: Error) => {
    console.error("Failed to fetch search results:", error);
    setSearchResults([]);
    setTotalRecords(0);
  }, []);

  // API mutation hooks
  const fetchDataMutation = useApiMutation<
    {
      data: VoterRecordAPI[];
      totalRecords: number;
    },
    {
      searchQuery: SearchQueryField[];
      pageSize: number;
      page: number;
    }
  >("/api/fetchFilteredData", "POST", {
    onSuccess: handleFetchDataSuccess,
    onError: handleFetchDataError,
  });

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
      console.error("Failed to generate report:", error);
      toast({
        title: "Error",
        description: `Failed to generate report: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  React.useEffect(() => {
    const fetchSearchResults = async () => {
      if (flattenedSearchQuery.length === 0) {
        setSearchResults([]);
        setTotalRecords(0);
        return;
      }

      try {
        const normalized = normalizeSearchQuery(flattenedSearchQuery);
        await fetchDataMutation.mutate({
          searchQuery: normalized,
          pageSize: 100, // Only fetch first 100 for preview
          page: 1,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // Request was cancelled, don't update state
          return;
        }
        if (error instanceof ZodError) {
          setSearchResults([]);
          setTotalRecords(0);
          toastRef.current({
            variant: "destructive",
            title: "Invalid Search Filters",
            description:
              "Some filter values are invalid. Please review your search and try again.",
          });
          // Provide additional context for developers
          console.error(
            "Search query normalization failed",
            error.flatten?.() ?? error,
          );
          return;
        }
      }
    };
    void fetchSearchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchDataMutation is a stable ref
  }, [flattenedSearchQuery]);

  // Handle report completion
  const handleReportComplete = (url: string) => {
    toast({
      description: formData.autoDownload
        ? "Document generated successfully! Download will start shortly."
        : "Document generated successfully! You can download it from the reports page.",
      duration: 5000,
    });

    if (formData.autoDownload) {
      // Force direct download for XLSX files
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

  const handleReportError = (errorMessage: string) => {
    toast({
      variant: "destructive",
      title: "Generation Failed",
      description: errorMessage || "Failed to generate document",
      duration: 5000,
    });
    setReportId(null);
  };

  const handleFormDataChange = useCallback(
    (updates: Partial<VoterListReportFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const handleXLSXFormDataChange = useCallback(
    (updates: Partial<XLSXConfigFormData>) => {
      // Filter out any 'pdf' format since voterList only supports xlsx
      const filteredUpdates = { ...updates };
      if (filteredUpdates.format === "pdf") {
        filteredUpdates.format = "xlsx";
      }

      setFormData((prev) => {
        const updated = { ...prev, ...filteredUpdates };
        const voterListData: VoterListReportFormData = {
          ...updated,
          format: "xlsx",
        };
        return voterListData;
      });
    },
    [],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setHasUserSubmitted(true);

    if (!validateForm()) {
      return;
    }

    if (flattenedSearchQuery.length === 0) {
      toast({
        title: "No Search Query",
        description:
          "Please perform a search first before generating a report.",
        variant: "destructive",
      });
      return;
    }

    if (totalRecords > MAX_RECORDS_FOR_EXPORT) {
      toast({
        title: "Too Many Records",
        description: `Found ${totalRecords.toLocaleString()} records, but the maximum for export is ${MAX_RECORDS_FOR_EXPORT.toLocaleString()}. ${ADMIN_CONTACT_INFO}`,
        variant: "destructive",
      });
      return;
    }

    clearErrorTracking();

    try {
      const normalized = normalizeSearchQuery(flattenedSearchQuery);
      const reportPayload = {
        type: "voterList" as const,
        name: formData.name,
        description: formData.description,
        format: "xlsx" as const,
        searchQuery: normalized,
        includeFields: formData.includeFields,
        xlsxConfig: {
          includeCompoundFields: formData.includeCompoundFields,
          columnOrder:
            formData.columnOrder.length > 0 ? formData.columnOrder : undefined,
          columnHeaders:
            Object.keys(formData.columnHeaders).length > 0
              ? formData.columnHeaders
              : undefined,
        },
      };

      await generateReportMutation.mutate(reportPayload);
    } catch (error) {
      if (error instanceof ZodError) {
        toast({
          variant: "destructive",
          title: "Invalid Search Filters",
          description:
            "Please fix invalid values in your search before generating the report.",
        });
        return;
      }
      console.error("Error generating report:", error);
    }
  };

  const canExport =
    flattenedSearchQuery.length > 0 &&
    totalRecords > 0 &&
    totalRecords <= MAX_RECORDS_FOR_EXPORT;

  return (
    <div className="space-y-6">
      <SearchQueryDisplay
        searchQuery={flattenedSearchQuery}
        totalRecords={totalRecords}
        maxRecordsForExport={MAX_RECORDS_FOR_EXPORT}
        adminContactInfo={ADMIN_CONTACT_INFO}
        onClearSearch={() => {
          clearSearchQuery();
          setSearchResults([]);
          setTotalRecords(0);
        }}
      />

      {/* Search Results Preview */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="primary-header">Search Results Preview</h3>
            <p className="text-sm text-muted-foreground">
              Showing first {searchResults.length} of{" "}
              {totalRecords.toLocaleString()} records
            </p>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="search-results">
                <AccordionTrigger>
                  View Search Results ({searchResults.length} records)
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mt-4">
                    <VoterRecordTable
                      records={searchResults}
                      fieldsList={[]}
                      paginated={false}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Report Configuration */}
      {canExport && (
        <Card>
          <CardHeader>
            <h3 className="primary-header">Report Configuration</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Report Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      handleFormDataChange({ name: e.target.value })
                    }
                    placeholder="Enter report name"
                    className={errors.name ? "border-destructive" : ""}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    aria-invalid={!!errors.name}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      handleFormDataChange({ description: e.target.value })
                    }
                    placeholder="Enter report description"
                    rows={3}
                  />
                </div>
              </div>

              {/* Field Selection and XLSX Configuration */}
              <Accordion
                type="multiple"
                defaultValue={["field-selection", "xlsx-config"]}
                className="w-full"
              >
                <FieldSelection
                  formData={formData}
                  onFormDataChange={handleXLSXFormDataChange}
                  errors={errors}
                />
                <XLSXConfig
                  formData={formData}
                  onFormDataChange={handleXLSXFormDataChange}
                />
              </Accordion>

              {/* Submit Button */}
              <div className="space-y-2">
                <ErrorDisplay
                  errors={errors}
                  hasUserSubmitted={hasUserSubmitted}
                  hadErrorsSinceLastSubmit={hadErrorsSinceLastSubmit}
                />

                <div className="flex items-start justify-between">
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="autoDownload"
                        checked={formData.autoDownload}
                        onCheckedChange={(checked) =>
                          handleFormDataChange({ autoDownload: checked })
                        }
                      />
                      <Label
                        htmlFor="autoDownload"
                        className="text-sm font-medium"
                      >
                        Auto-download
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
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
                  </div>
                  <div className="text-right">
                    <Button
                      type="submit"
                      disabled={
                        generateReportMutation.loading ||
                        !canExport ||
                        (hasUserSubmitted && Object.keys(errors).length > 0)
                      }
                      className="min-w-[120px]"
                    >
                      {generateReportMutation.loading
                        ? "Generating..."
                        : "Generate Report"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {generateReportMutation.loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="bg-primary-foreground p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Generating document...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {reportId && (
        <ReportStatusTracker
          reportId={reportId}
          onComplete={handleReportComplete}
          onError={handleReportError}
        />
      )}
    </div>
  );
};
