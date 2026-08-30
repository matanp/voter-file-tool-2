import React from "react";
import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import prisma from "~/lib/prisma";
import { ElectionConfigTab } from "./ElectionConfigTab";

export const dynamic = "force-dynamic";

const ElectionConfigPage = async () => {
  const access = await getAdminPageAccess();
  if (!access.ok) {
    return <AdminPageAccessDenied />;
  }

  const electionDates = await prisma.electionDate.findMany();
  const officeNames = await prisma.officeName.findMany();

  return (
    <div className="w-full p-6">
      <h1 className="section-header mb-6">Election Config</h1>
      <ElectionConfigTab
        electionDates={electionDates}
        officeNames={officeNames}
      />
    </div>
  );
};

export default ElectionConfigPage;
