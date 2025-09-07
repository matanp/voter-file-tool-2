"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import {
  type CommitteeWithMembers,
  mapCommiteesToReportShape,
} from "./committeeUtils";
import { useToast } from "~/components/ui/use-toast";
import {
  type GenerateReportData,
  generateReportSchema,
} from "~/lib/validators/generateReport";

interface GenerateCommitteeReportButtonProps {
  committeeLists: CommitteeWithMembers[];
}

export const GenerateCommitteeReportButton: React.FC<
  GenerateCommitteeReportButtonProps
> = ({ committeeLists }) => {
  const { toast } = useToast();

  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.preventDefault();

    const committeeData = mapCommiteesToReportShape(committeeLists);

    const formData: GenerateReportData = {
      type: "ldCommittees",
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

    toast({
      description: "Generating PDF, your report will download soon",
      duration: 3000,
    });

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
        return;
      }

      // Parse response and validate success payload
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Invalid response format from server",
          duration: 5000,
        });
        return;
      }

      // Validate expected success payload structure
      if (!responseData || typeof responseData !== 'object' || !responseData.reportId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Unexpected response format from server",
          duration: 5000,
        });
        return;
      }

      // Success path - show success toast and trigger job-based flow
      toast({
        title: "Success",
        description: "Committee report generation started successfully. You can track progress in the Reports section.",
        duration: 5000,
      });

      // The job-based flow will be handled by the PendingJobsIndicator component
      // which polls for job status updates. The reportId is now in the database
      // and will be picked up by the polling system.

    } catch (networkError) {
      // Handle network errors (fetch failures, timeouts, etc.)
      toast({
        variant: "destructive",
        title: "Network Error",
        description: `Failed to generate report: ${networkError instanceof Error ? networkError.message : 'Unknown network error'}`,
        duration: 5000,
      });
      return;
    }
  };

  return (
    <Button onClick={(e) => handleSubmit(e)}>
      Generate Committee List Report
    </Button>
  );
};

export default GenerateCommitteeReportButton;
