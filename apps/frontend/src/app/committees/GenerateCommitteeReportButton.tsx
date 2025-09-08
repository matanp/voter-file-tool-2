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
} from "~/lib/validators/generateReport";
import { useReportJobStatus } from "~/hooks/useReportJobStatus";
import { useRouter } from "next/navigation";
import { ToastAction } from "~/components/ui/toast";

interface GenerateCommitteeReportButtonProps {
  committeeLists: CommitteeWithMembers[];
}

export const GenerateCommitteeReportButton: React.FC<
  GenerateCommitteeReportButtonProps
> = ({ committeeLists }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [reportJobId, setReportJobId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Use the polling hook to track job status
  const { isLoading } = useReportJobStatus(reportJobId, {
    onComplete: (downloadUrl) => {
      // Auto-navigate to reports page when complete
      router.push("/reports");
      toast({
        title: "Report Ready!",
        description: "Your committee report has been generated successfully.",
        action: (
          <ToastAction
            altText="Download report"
            onClick={() => window.open(downloadUrl, "_blank")}
          >
            Download
          </ToastAction>
        ),
        duration: 10000,
      });
      setReportJobId(null);
      setIsGenerating(false);
    },
    onError: (errorMessage) => {
      toast({
        variant: "destructive",
        title: "Report Generation Failed",
        description: errorMessage,
        action: (
          <ToastAction
            altText="View reports"
            onClick={() => router.push("/reports")}
          >
            View Reports
          </ToastAction>
        ),
        duration: 10000,
      });
      setReportJobId(null);
      setIsGenerating(false);
    },
  });

  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.preventDefault();

    if (isGenerating) {
      return; // Prevent multiple submissions
    }

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
      setReportJobId(responseData.reportId);

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

  // Show loading state while generating or polling
  const isProcessing = isGenerating || (!!reportJobId && isLoading);

  return (
    <Button onClick={(e) => handleSubmit(e)} disabled={isProcessing}>
      {isProcessing ? "Generating Report..." : "Generate Committee List Report"}
    </Button>
  );
};

export default GenerateCommitteeReportButton;
