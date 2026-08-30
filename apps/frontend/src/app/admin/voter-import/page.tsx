import React from "react";
import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import { VoterImport } from "./VoterImport";

export const dynamic = "force-dynamic";

const VoterImportPage = async () => {
  const access = await getAdminPageAccess();
  if (!access.ok) {
    return <AdminPageAccessDenied />;
  }

  return (
    <div className="w-full p-6">
      <h1 className="section-header mb-6">Voter Import</h1>
      <VoterImport />
    </div>
  );
};

export default VoterImportPage;
