"use client";
import React, { useState, useCallback } from "react";
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
import type { VoterRecord } from "@prisma/client";
import type { XLSXConfigFormData } from "../committee-reports/types";
import { useToast } from "~/components/ui/use-toast";
import { useVoterSearch } from "~/contexts/VoterSearchContext";
import { MAX_RECORDS_FOR_EXPORT } from "~/constants/limits";
import { ReportStatusTracker } from "~/app/components/ReportStatusTracker";

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
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  // Create the Prisma record by spreading the API record and handling special cases
  const prismaRecord = {
    ...apiRecord,
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
  const { searchQuery, flattenedSearchQuery, clearSearchQuery } =
    useVoterSearch();

  const [searchResults, setSearchResults] = useState<VoterRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const { toast } = useToast();

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

  // Fetch search results when search query changes
  React.useEffect(() => {
    const abortController = new AbortController();

    const fetchSearchResults = async () => {
      if (flattenedSearchQuery.length === 0) {
        setSearchResults([]);
        setTotalRecords(0);
        return;
      }

      try {
        const response = await fetch("/api/fetchFilteredData", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            searchQuery: flattenedSearchQuery,
            pageSize: 100, // Only fetch first 100 for preview
            page: 1,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch search results");
        }

        const data = (await response.json()) as {
          data: VoterRecordAPI[];
          totalRecords: number;
        };

        // Convert API records to Prisma format for display
        const prismaRecords = data.data.map(convertAPIToPrismaRecord);
        setSearchResults(prismaRecords);
        setTotalRecords(data.totalRecords);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // Request was cancelled, don't update state
          return;
        }

        console.error("Error fetching search results:", error);
        setSearchResults([]);
        setTotalRecords(0);
      }
    };

    void fetchSearchResults();

    return () => {
      abortController.abort();
    };
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

    setIsGenerating(false);
    setReportId(null);
  };

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
      setFormData(
        (prev) => ({ ...prev, ...filteredUpdates }) as VoterListReportFormData,
      );
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
        description: `Found ${totalRecords} records, but the maximum for export is ${MAX_RECORDS_FOR_EXPORT}. Please refine your search criteria.`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    clearErrorTracking();

    try {
      const reportPayload = {
        type: "voterList" as const,
        name: formData.name,
        description: formData.description,
        format: "xlsx" as const,
        searchQuery: flattenedSearchQuery,
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
        description: "Generating XLSX document...",
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

  const canExport =
    flattenedSearchQuery.length > 0 &&
    totalRecords > 0 &&
    totalRecords <= MAX_RECORDS_FOR_EXPORT;

  return (
    <div className="space-y-6">
      {/* Current Search Query Display */}
      {searchQuery.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="primary-header">Current Search Query</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {searchQuery
                .filter((field) => {
                  if (field.compoundType) {
                    // For compound fields, only show if at least one sub-field has a non-empty value
                    return field.fields.some((subField) => {
                      const value = subField.value;
                      return (
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                      );
                    });
                  } else {
                    // For simple fields, only show if the value is non-empty
                    const value = field.value;
                    return (
                      value !== null &&
                      value !== undefined &&
                      String(value).trim() !== ""
                    );
                  }
                })
                .map((field, index) => (
                  <div key={index} className="space-y-1">
                    {field.compoundType ? (
                      // Compound field - show only sub-fields with non-empty values
                      <div>
                        <span className="font-medium text-sm">
                          {field.displayName}:
                        </span>
                        <div className="ml-4 space-y-1">
                          {field.fields
                            .filter((subField) => {
                              const value = subField.value;
                              return (
                                value !== null &&
                                value !== undefined &&
                                String(value).trim() !== ""
                              );
                            })
                            .map((subField, subIndex) => (
                              <div
                                key={subIndex}
                                className="flex items-center space-x-2 text-sm"
                              >
                                <span className="font-medium">
                                  {subField.displayName}:
                                </span>
                                <span className="text-muted-foreground">
                                  {String(subField.value ?? "")}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      // Simple field
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium">
                          {field.displayName}:
                        </span>
                        <span className="text-muted-foreground">
                          {String(field.value ?? "")}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {totalRecords > 0 && (
                  <span>
                    Found {totalRecords.toLocaleString()} records
                    {totalRecords > MAX_RECORDS_FOR_EXPORT && (
                      <span className="text-destructive ml-1">
                        (exceeds export limit of{" "}
                        {MAX_RECORDS_FOR_EXPORT.toLocaleString()})
                      </span>
                    )}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearSearchQuery();
                  setSearchResults([]);
                  setTotalRecords(0);
                }}
              >
                Clear Search
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Search Query Message */}
      {searchQuery.length === 0 && (
        <Card>
          <CardHeader>
            <h3 className="primary-header">No Search Query</h3>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please go to the Record Search page to search for voter records
              first, then return here to export them.
            </p>
          </CardContent>
        </Card>
      )}

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
              <Accordion type="multiple" className="w-full">
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
                        isGenerating ||
                        !canExport ||
                        (hasUserSubmitted && Object.keys(errors).length > 0)
                      }
                      className="min-w-[120px]"
                    >
                      {isGenerating ? "Generating..." : "Generate Report"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isGenerating && (
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
