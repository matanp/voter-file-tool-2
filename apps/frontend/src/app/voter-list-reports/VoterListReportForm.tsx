"use client";
import React, { useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
import { ErrorDisplay } from "./components/ErrorDisplay";
import type {
  VoterRecordField,
  VoterRecordAPI,
} from "@voter-file-tool/shared-validators";
import { mapVoterRecordAPIToMemberWithFields } from "@voter-file-tool/shared-validators";
import type { VoterRecord } from "@prisma/client";
import type { XLSXConfigFormData } from "../committee-reports/types";
import { useToast } from "~/components/ui/use-toast";
import { useVoterSearch } from "~/contexts/VoterSearchContext";
import { MAX_RECORDS_FOR_EXPORT } from "~/constants/limits";

// Utility function to convert API records back to Prisma format for display
function convertAPIToPrismaRecord(apiRecord: VoterRecordAPI): VoterRecord {
  return {
    ...apiRecord,
    DOB: apiRecord.DOB ? new Date(apiRecord.DOB) : null,
    lastUpdate: apiRecord.lastUpdate ? new Date(apiRecord.lastUpdate) : null,
    originalRegDate: apiRecord.originalRegDate
      ? new Date(apiRecord.originalRegDate)
      : null,
  } as VoterRecord;
}

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
}

export const VoterListReportForm: React.FC<VoterListReportFormProps> = () => {
  const { searchQuery, flattenedSearchQuery, clearSearchQuery } =
    useVoterSearch();

  const [searchResults, setSearchResults] = useState<VoterRecordAPI[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
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
  });

  const { errors, hasUserSubmitted, setHasUserSubmitted, validateForm } =
    useFormValidation(formData);

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

    if (totalRecords > MAX_RECORDS_FOR_EXPORT) {
      toast({
        title: "Too Many Records",
        description: `Cannot export ${totalRecords} records. Maximum allowed is ${MAX_RECORDS_FOR_EXPORT.toLocaleString()}.`,
        variant: "destructive",
      });
      return;
    }

    if (searchResults.length === 0) {
      toast({
        title: "No Records",
        description: "Please search for voter records first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const partialVoterRecords = searchResults
        .map((voter) => {
          return mapVoterRecordAPIToMemberWithFields(
            voter,
            formData.includeFields,
            formData.includeCompoundFields,
          );
        })
        .filter((record) => record !== null);

      const reportPayload = {
        type: "voterList" as const,
        name: formData.name,
        description: formData.description,
        format: "xlsx" as const,
        payload: partialVoterRecords,
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
        title: "Generation Error",
        description: "Failed to generate voter list report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // If we have search query in context but no search results, fetch them
  React.useEffect(() => {
    if (flattenedSearchQuery.length > 0 && searchResults.length === 0) {
      const fetchSearchResults = async () => {
        try {
          const response = await fetch("/api/fetchFilteredData", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              searchQuery: flattenedSearchQuery,
              pageSize: 100, // Maximum allowed by API
              page: 1,
            }),
          });

          if (response.ok) {
            const data = (await response.json()) as {
              data: VoterRecordAPI[];
              totalRecords: number;
            };
            setSearchResults(data.data || []);
            setTotalRecords(data.totalRecords || 0);
          }
        } catch (error) {
          console.error("Failed to load search results from context:", error);
        }
      };

      void fetchSearchResults();
    }
  }, [flattenedSearchQuery, searchResults.length]);

  // Note: We don't clear the search query on unmount anymore
  // to allow users to navigate back and forth between pages

  const canExport = totalRecords > 0 && totalRecords <= MAX_RECORDS_FOR_EXPORT;

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

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem
            value="search-results"
            className="bg-white rounded-lg shadow-sm"
          >
            <AccordionTrigger className="primary-header text-left bg-white px-6 py-4">
              <div className="text-left">
                <div className="font-semibold">
                  Search Results ({totalRecords.toLocaleString()} records)
                  {totalRecords > MAX_RECORDS_FOR_EXPORT && (
                    <span className="text-destructive ml-2">
                      (Too many for export - max{" "}
                      {MAX_RECORDS_FOR_EXPORT.toLocaleString()})
                    </span>
                  )}
                </div>
                {totalRecords > 100 && (
                  <div className="text-sm text-muted-foreground font-normal">
                    Showing preview of first 100 records. All{" "}
                    {totalRecords.toLocaleString()} records will be included in
                    the export.
                  </div>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 bg-white p-6 pt-0 rounded-lg">
              <VoterRecordTable
                records={searchResults.map(convertAPIToPrismaRecord)}
                paginated={false}
                fieldsList={["DOB", "Telephone"]}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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
                />

                <div className="flex justify-end">
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
            </form>
          </CardContent>
        </Card>
      )}

      {/* Report Status */}
      {reportId && (
        <Card>
          <CardHeader>
            <CardTitle>Report Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Report ID: {reportId}</p>
            <p className="text-sm text-muted-foreground">
              {`Your report is being generated. You will be notified when it's
              ready.`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
