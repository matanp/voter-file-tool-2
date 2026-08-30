import React from "react";
import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import { VoterListReportForm } from "./VoterListReportForm";
import { PageContainer } from "~/components/layout/PageContainer";
import { PageHeader } from "~/components/layout/PageHeader";

export const dynamic = "force-dynamic";

const VoterListReportPage = async () => {
  const access = await getAdminPageAccess();
  if (!access.ok) {
    return <AdminPageAccessDenied />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Voter List Reports"
        description="Generate voter list reports in XLSX format from search results. Only available for searches with 20,000 or fewer records."
      />
      <VoterListReportForm />
    </PageContainer>
  );
};

export default VoterListReportPage;
