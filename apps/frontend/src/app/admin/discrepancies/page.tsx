import React from "react";
import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import { CommitteeUploadDiscrepancies } from "./CommitteeUploadDiscrepancies";

export const dynamic = "force-dynamic";

const DiscrepanciesPage = async () => {
  const access = await getAdminPageAccess();
  if (!access.ok) {
    return <AdminPageAccessDenied />;
  }

  return (
    <div className="w-full p-6">
      <h1 className="section-header mb-6">Discrepancies</h1>
      <CommitteeUploadDiscrepancies />
    </div>
  );
};

export default DiscrepanciesPage;
