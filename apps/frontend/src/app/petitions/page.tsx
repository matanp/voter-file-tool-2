import React from "react";
import { PrivilegeLevel } from "@prisma/client";

import prisma from "~/lib/prisma";
import GeneratePetitionForm from "./GeneratePetitionForm";
import PageSignInRequired from "~/components/ui/PageSignInRequired";
import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { getAuthenticatedPageAccess } from "~/lib/getAdminPageAccess";
import { hasPermissionFor } from "~/lib/utils";

const PetitionsPage: React.FC = async () => {
  const access = await getAuthenticatedPageAccess();
  if (!access.ok) {
    return <PageSignInRequired />;
  }

  // Petition generation POSTs to /api/generateReport, which requires RequestAccess.
  // Gate the page to match so ReadAccess users don't reach a form the server rejects.
  if (!hasPermissionFor(access.privilegeLevel, PrivilegeLevel.RequestAccess)) {
    return <AdminPageAccessDenied />;
  }

  const dropdownLists = await prisma.dropdownLists.findFirst({});
  const electionDates = await prisma.electionDate.findMany();
  const officeNames = await prisma.officeName.findMany();

  if (!dropdownLists) {
    return <div>Something went wrong</div>;
  }

  return (
    <div className="w-full p-4">
      <GeneratePetitionForm
        parties={dropdownLists.party.filter((p) => p !== "BLK" && p !== "OTH")}
        electionDates={electionDates}
        officeNames={officeNames}
      />
    </div>
  );
};

export default PetitionsPage;
