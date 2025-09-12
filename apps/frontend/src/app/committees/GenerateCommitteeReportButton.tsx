import React from "react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export const GenerateCommitteeReportButton: React.FC = () => {
  return (
    <Button asChild>
      <Link href="/committee-reports">Generate Committee Report</Link>
    </Button>
  );
};

export default GenerateCommitteeReportButton;
