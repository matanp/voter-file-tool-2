import React from "react";
import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { getAdminPageAccess } from "~/lib/getAdminPageAccess";
import { LtedCrosswalkTab } from "./LtedCrosswalkTab";

export const dynamic = "force-dynamic";

const LtedCrosswalkPage = async () => {
  const access = await getAdminPageAccess();
  if (!access.ok) {
    return <AdminPageAccessDenied />;
  }

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-semibold mb-6">LTED Crosswalk</h1>
      <LtedCrosswalkTab />
    </div>
  );
};

export default LtedCrosswalkPage;
