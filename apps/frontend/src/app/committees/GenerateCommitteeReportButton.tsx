"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { useRouter } from "next/navigation";

export const GenerateCommitteeReportButton: React.FC = () => {
  const router = useRouter();

  const handleClick = () => {
    router.push("/committee-reports");
  };

  return <Button onClick={handleClick}>Generate Committee Report</Button>;
};

export default GenerateCommitteeReportButton;
