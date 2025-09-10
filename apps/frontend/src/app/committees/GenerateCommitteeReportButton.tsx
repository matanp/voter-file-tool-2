"use client";

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  type CommitteeWithMembers,
  mapCommiteesToReportShape,
} from "./committeeUtils";
import { useToast } from "~/components/ui/use-toast";
import {
  type GenerateReportData,
  generateReportSchema,
  type AllowedVoterRecordFields,
  CompoundType,
  getCompoundTypeFields,
  getFieldCompoundType,
  getCompoundTypeOptions,
} from "@voter-file-tool/shared-validators";

import { useRouter } from "next/navigation";
import { ToastAction } from "~/components/ui/toast";
import { ReportStatusTracker } from "../components/ReportStatusTracker";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";

interface GenerateCommitteeReportButtonProps {
  committeeLists: CommitteeWithMembers[];
}

export const GenerateCommitteeReportButton: React.FC<
  GenerateCommitteeReportButtonProps
> = ({ committeeLists }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [reportId, setReportId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [complete, setComplete] = useState(false);
  const [selectedFields, setSelectedFields] = useState<
    AllowedVoterRecordFields[]
  >([]);
  const [selectedCompoundTypes, setSelectedCompoundTypes] = useState<
    CompoundType[]
  >([]);
  const [isFieldSelectionOpen, setIsFieldSelectionOpen] = useState(false);

  // Get compound types from centralized definitions
  const compoundTypeOptions = getCompoundTypeOptions();

  // Individual fields that don't belong to compound types
  const individualFields = [
    "VRCNUM",
    "party",
    "gender",
    "DOB",
    "addressForCommittee",
    "L_T",
    "originalRegDate",
    "statevid",
  ] as AllowedVoterRecordFields[];

  // All fields that belong to compound types
  const compoundFields = compoundTypeOptions.flatMap(
    (option) =>
      getCompoundTypeFields(option.type) as AllowedVoterRecordFields[],
  );

  // All available fields (individual + compound fields)
  const allAvailableFields = [...individualFields, ...compoundFields];

  const handleFieldToggle = (field: AllowedVoterRecordFields) => {
    const fieldCompoundType = getFieldCompoundType(field);

    setSelectedFields((prev) => {
      if (prev.includes(field)) {
        // Removing field - no additional logic needed
        return prev.filter((f) => f !== field);
      } else {
        // Adding field - check if any compound type containing this field is selected
        if (
          fieldCompoundType &&
          selectedCompoundTypes.includes(fieldCompoundType)
        ) {
          // Don't add individual field if compound type is selected
          return prev;
        }

        // If this field belongs to a compound type, remove that compound type selection
        if (fieldCompoundType) {
          setSelectedCompoundTypes((prevCompoundTypes) =>
            prevCompoundTypes.filter((t) => t !== fieldCompoundType),
          );
        }

        return [...prev, field];
      }
    });
  };

  const handleCompoundTypeToggle = (compoundType: CompoundType) => {
    setSelectedCompoundTypes((prev) => {
      if (prev.includes(compoundType)) {
        // Removing compound type - no additional logic needed
        return prev.filter((t) => t !== compoundType);
      } else {
        // Adding compound type - remove any individual fields that belong to this compound type
        const compoundFields = getCompoundTypeFields(
          compoundType,
        ) as AllowedVoterRecordFields[];
        setSelectedFields((currentFields) =>
          currentFields.filter((field) => !compoundFields.includes(field)),
        );
        return [...prev, compoundType];
      }
    });
  };

  const handleSelectAllIndividual = () => {
    const allSelected = individualFields.every((field) =>
      selectedFields.includes(field),
    );
    if (allSelected) {
      setSelectedFields((prev) =>
        prev.filter((field) => !individualFields.includes(field)),
      );
    } else {
      setSelectedFields((prev) => [...new Set([...prev, ...individualFields])]);
    }
  };

  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.preventDefault();

    if (isGenerating) {
      return; // Prevent multiple submissions
    }

    setComplete(false);

    const committeeData = mapCommiteesToReportShape(
      committeeLists,
      selectedFields,
      selectedCompoundTypes.length > 0 ? selectedCompoundTypes : undefined,
    );

    const formData: GenerateReportData = {
      type: "ldCommittees",
      format: "xlsx",
      payload: committeeData,
    };

    const validationResult = generateReportSchema.safeParse(formData);

    if (!validationResult.success) {
      const fieldErrors: Partial<Record<string, string>> = {};
      validationResult.error.errors.forEach((err) => {
        const path = err.path.join(".");
        fieldErrors[path] = err.message;
      });

      console.error("Validation errors:", fieldErrors);
      toast({
        variant: "destructive",
        title: "Validation Error",
        description:
          "There was an error validating the committee data. See console for more details.",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(`/api/generateReport`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validationResult.data),
      });

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Error generating PDF: ${response.status} ${response.statusText}`,
          duration: 5000,
        });
        setIsGenerating(false);
        return;
      }

      // Parse response and validate success payload
      let responseData;
      try {
        responseData = (await response.json()) as unknown as {
          reportId: string;
        };
      } catch (parseError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Invalid response format from server",
          duration: 5000,
        });
        setIsGenerating(false);
        return;
      }

      // Validate expected success payload structure
      if (
        !responseData ||
        typeof responseData !== "object" ||
        !responseData.reportId
      ) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Unexpected response format from server",
          duration: 5000,
        });
        setIsGenerating(false);
        return;
      }

      // Start tracking the job
      setReportId(responseData.reportId);

      // Show initial toast with tracking info
      toast({
        title: "Report Generation Started",
        description:
          "Your committee report is being generated. You'll be notified when it's ready.",
        action: (
          <ToastAction
            altText="View report status"
            onClick={() => router.push("/reports")}
          >
            View Status
          </ToastAction>
        ),
        duration: 8000,
      });
    } catch (networkError) {
      // Handle network errors (fetch failures, timeouts, etc.)
      toast({
        variant: "destructive",
        title: "Network Error",
        description: `Failed to generate report: ${networkError instanceof Error ? networkError.message : "Unknown network error"}`,
        duration: 5000,
      });
      setIsGenerating(false);
      return;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generate Committee Report</CardTitle>
          <CardDescription>
            Select which fields to include in your committee report. Only
            election district is included by default for grouping purposes. When
            you select compound types (like "Name Details" or "Address
            Details"), the related fields are flattened into a single string and
            the corresponding base fields (name, address, etc.) are
            automatically included. You can also select individual fields
            separately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setIsFieldSelectionOpen(!isFieldSelectionOpen)}
            >
              <span>
                Select Additional Fields (
                {selectedFields.length + selectedCompoundTypes.length} selected)
              </span>
              {isFieldSelectionOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            {isFieldSelectionOpen && (
              <div className="space-y-4 pt-4 border-t">
                {/* Compound Types Section */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-700">
                    Field Groups
                  </h4>
                  <div className="space-y-4">
                    {compoundTypeOptions.map((option) => {
                      const compoundFields = getCompoundTypeFields(
                        option.type,
                      ) as AllowedVoterRecordFields[];
                      const isCompoundTypeSelected =
                        selectedCompoundTypes.includes(option.type);
                      const selectedIndividualFields = compoundFields.filter(
                        (field) => selectedFields.includes(field),
                      );
                      const hasIndividualSelection =
                        selectedIndividualFields.length > 0;

                      return (
                        <div
                          key={option.type}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          {/* Compound Type Header */}
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`compound-${option.type}`}
                              checked={isCompoundTypeSelected}
                              onCheckedChange={() =>
                                handleCompoundTypeToggle(option.type)
                              }
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`compound-${option.type}`}
                                className="font-medium text-sm cursor-pointer"
                              >
                                {option.label}
                              </label>
                              <p className="text-xs text-gray-500">
                                {option.description}
                              </p>
                            </div>
                          </div>

                          {/* Individual Fields for this Compound Type */}
                          <div className="ml-6 space-y-1">
                            <p className="text-xs text-gray-600 font-medium">
                              Or select individual fields:
                            </p>
                            <div className="grid grid-cols-2 gap-1">
                              {compoundFields.map((field) => (
                                <div
                                  key={field}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`compound-field-${field}`}
                                    checked={selectedFields.includes(field)}
                                    disabled={isCompoundTypeSelected}
                                    onCheckedChange={() =>
                                      handleFieldToggle(field)
                                    }
                                  />
                                  <label
                                    htmlFor={`compound-field-${field}`}
                                    className={`text-xs ${isCompoundTypeSelected ? "text-gray-400" : ""}`}
                                  >
                                    {field}
                                  </label>
                                </div>
                              ))}
                            </div>
                            {isCompoundTypeSelected && (
                              <p className="text-xs text-gray-400">
                                All fields included in {option.label}
                              </p>
                            )}
                            {hasIndividualSelection &&
                              !isCompoundTypeSelected && (
                                <p className="text-xs text-blue-600">
                                  {selectedIndividualFields.length} of{" "}
                                  {compoundFields.length} fields selected
                                </p>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Individual Fields Section */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all-individual"
                      checked={individualFields.every((field) =>
                        selectedFields.includes(field),
                      )}
                      onCheckedChange={handleSelectAllIndividual}
                    />
                    <label
                      htmlFor="select-all-individual"
                      className="font-medium text-sm"
                    >
                      Individual Fields ({individualFields.length} fields)
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 ml-6">
                    {individualFields.map((field) => (
                      <div key={field} className="flex items-center space-x-2">
                        <Checkbox
                          id={field}
                          checked={selectedFields.includes(field)}
                          onCheckedChange={() => handleFieldToggle(field)}
                        />
                        <label htmlFor={field} className="text-sm">
                          {field}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={(e) => handleSubmit(e)}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating
              ? "Generating XLSX Report..."
              : "Generate Committee List Report (XLSX)"}
          </Button>
        </CardContent>
      </Card>

      {reportId && (
        <ReportStatusTracker
          reportId={reportId}
          onComplete={(url) => {
            console.log("complete!", url);
            setComplete(true);
            setIsGenerating(false);
          }}
          onError={(error) => {
            setComplete(false);
            setIsGenerating(false);
          }}
        />
      )}
      {complete && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">
            Your report is ready! Go to the reports page to view it.
          </p>
        </div>
      )}
    </div>
  );
};

export default GenerateCommitteeReportButton;
