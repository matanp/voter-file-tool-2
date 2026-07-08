import React from "react";
import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import { VoterListReportForm } from "./VoterListReportForm";

export const dynamic = "force-dynamic";

const VoterListReportPage = async () => {
  const access = await getAdminPageAccess();
  if (!access.ok) {
    return <AdminPageAccessDenied />;
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
