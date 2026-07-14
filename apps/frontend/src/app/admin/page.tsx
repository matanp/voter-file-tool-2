import React from "react";
import { AdminDataClient } from "./data/AdminDataClient";
import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import prisma from "~/lib/prisma";

export const dynamic = "force-dynamic";

const AdminPage = async () => {
  const access = await getAdminPageAccess();
  if (!access.ok) {
    return <AdminPageAccessDenied />;
  }

  const electionDates = await prisma.electionDate.findMany();
  const officeNames = await prisma.officeName.findMany();

  return (
    <AdminDataClient electionDates={electionDates} officeNames={officeNames} />
  );
};

export default AdminPage;
