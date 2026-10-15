import React from "react";
import { PrivilegeLevel } from "@prisma/client";

import prisma from "~/lib/prisma";
import GeneratePetitionForm from "./GeneratePetitionForm";
import PageSignInRequired from "~/components/ui/PageSignInRequired";
import AdminPageAccessDenied from "~/components/admin/AdminPageAccessDenied";
import { getAuthenticatedPageAccess } from "~/lib/getAdminPageAccess";
import { hasPermissionFor } from "~/lib/utils";

export const dynamic = "force-dynamic";

const PetitionsPage: React.FC = async () => {
  const access = await getAuthenticatedPageAccess();
  if (!access.ok) {
    return <PageSignInRequired />;
  }

  // Petition generation is Admin-only (leader-petition-visibility/01), and
  // /api/generateReport rejects designatedPetition below Admin. Gate the page to match.
  if (!hasPermissionFor(access.privilegeLevel, PrivilegeLevel.Admin)) {
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
