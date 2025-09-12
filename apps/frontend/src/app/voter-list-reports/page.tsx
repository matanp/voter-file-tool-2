import React from "react";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";
import { PrivilegeLevel } from "@prisma/client";
import { VoterListReportForm } from "./VoterListReportForm";
import { Card, CardContent } from "~/components/ui/card";

const VoterListReportPage = async () => {
  const permissions = await auth();

  const isAdminUser = hasPermissionFor(
    permissions?.user?.privilegeLevel ?? PrivilegeLevel.ReadAccess,
    PrivilegeLevel.Admin,
  );

  if (!isAdminUser) {
    return (
      <div className="w-full p-4">
        <Card>
          <CardContent className="pt-6">
            <p>You do not have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-primary-foreground">
      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="primary-header">Voter List Reports</h1>
          <p className="text-muted-foreground mt-2">
            Generate voter list reports in XLSX format from search results. Only
            available for searches with 20,000 or fewer records.
          </p>
        </div>
        <VoterListReportForm />
      </div>
    </div>
  );
};

export default VoterListReportPage;
