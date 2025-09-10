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
  allowedVoterRecordFields,
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
  const [isFieldSelectionOpen, setIsFieldSelectionOpen] = useState(false);

  // Group fields by category for better organization
  const fieldCategories = {
    "Basic Info": [
      "VRCNUM",
      "lastName",
      "firstName",
      "middleInitial",
      "suffixName",
      "party",
      "gender",
      "DOB",
    ] as AllowedVoterRecordFields[],
    Address: [
      "houseNum",
      "street",
      "apartment",
      "halfAddress",
      "resAddrLine2",
      "resAddrLine3",
      "city",
      "state",
      "zipCode",
      "zipSuffix",
    ] as AllowedVoterRecordFields[],
    "Mailing Address": [
      "mailingAddress1",
      "mailingAddress2",
      "mailingAddress3",
      "mailingAddress4",
      "mailingCity",
      "mailingState",
      "mailingZip",
      "mailingZipSuffix",
    ] as AllowedVoterRecordFields[],
    Contact: ["telephone", "email"] as AllowedVoterRecordFields[],
    Districts: [
      "electionDistrict",
      "countyLegDistrict",
      "stateAssmblyDistrict",
      "stateSenateDistrict",
      "congressionalDistrict",
      "CC_WD_Village",
      "townCode",
    ] as AllowedVoterRecordFields[],
    Other: [
      "addressForCommittee",
      "L_T",
      "originalRegDate",
      "statevid",
    ] as AllowedVoterRecordFields[],
  };

  const handleFieldToggle = (field: AllowedVoterRecordFields) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  };

  const handleSelectAll = (category: AllowedVoterRecordFields[]) => {
    const allSelected = category.every((field) =>
      selectedFields.includes(field),
    );
    if (allSelected) {
      setSelectedFields((prev) =>
        prev.filter((field) => !category.includes(field)),
      );
    } else {
      setSelectedFields((prev) => [...new Set([...prev, ...category])]);
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
            Select which fields to include in your committee report. Basic
            fields (name, address, city, state, zip, phone) are always included.
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
                Select Additional Fields ({selectedFields.length} selected)
              </span>
              {isFieldSelectionOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            {isFieldSelectionOpen && (
              <div className="space-y-4 pt-4 border-t">
                {Object.entries(fieldCategories).map(
                  ([categoryName, fields]) => (
                    <div key={categoryName} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`select-all-${categoryName}`}
                          checked={fields.every((field) =>
                            selectedFields.includes(field),
                          )}
                          onCheckedChange={() => handleSelectAll(fields)}
                        />
                        <label
                          htmlFor={`select-all-${categoryName}`}
                          className="font-medium text-sm"
                        >
                          {categoryName} ({fields.length} fields)
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 ml-6">
                        {fields.map((field) => (
                          <div
                            key={field}
                            className="flex items-center space-x-2"
                          >
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
                  ),
                )}
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
