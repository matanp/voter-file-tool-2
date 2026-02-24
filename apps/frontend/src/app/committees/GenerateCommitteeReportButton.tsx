import React from "react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export const GenerateCommitteeReportButton: React.FC = () => {
  return (
    <Button asChild>
      <Link href="/committee-roster-reports">
        Generate Committee Roster Report
      </Link>
    </Button>
  );
};

export default GenerateCommitteeReportButton;
