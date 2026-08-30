import React from "react";
import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import { WeightedTableImport } from "./WeightedTableImport";

export const dynamic = "force-dynamic";

const WeightedTablePage = async () => {
  const access = await getAdminPageAccess();
  if (!access.ok) {
    return <AdminPageAccessDenied />;
  }

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-semibold mb-6">Weighted Table</h1>
      <WeightedTableImport />
    </div>
  );
};

export default WeightedTablePage;
