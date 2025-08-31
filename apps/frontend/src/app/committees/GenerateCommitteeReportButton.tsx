"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { mapCommiteesToReportShape } from "./committeeUtils";
import { ldCommitteesArraySchema } from "~/lib/validators/ldCommittees";
import { useToast } from "~/components/ui/use-toast";
import { type CommitteeList } from "@prisma/client";

interface GenerateCommitteeReportButtonProps {
  committeeLists: CommitteeList[];
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

    const validationResult = ldCommitteesArraySchema.safeParse(committeeData);

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

    const response = await fetch(`/api/committee/generateCommitteeReport`, {
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
        description: "Error generating PDF",
        duration: 5000,
      });
      return;
    }

    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Committee Report.pdf");
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={(e) => handleSubmit(e)}>
      Generate Committee List Report
    </Button>
  );
};

export default GenerateCommitteeReportButton;
