import React from "react";
import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import { AbsenteeReport } from "./AbsenteeReport";

export const dynamic = "force-dynamic";

const AbsenteeReportPage = async () => {
  const access = await getAdminPageAccess();
  if (!access.ok) {
    return <AdminPageAccessDenied />;
  }

  return (
    <div className="w-full p-6">
      <h1 className="section-header mb-6">Absentee Report</h1>
      <AbsenteeReport />
    </div>
  );
};

export default AbsenteeReportPage;
