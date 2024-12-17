import React from "react";

import prisma from "~/lib/prisma";
import GeneratePetitionForm from "./GeneratePetitionForm";
import AuthCheck from "~/components/ui/authcheck";

const CommitteeLists: React.FC = async () => {
  const dropdownLists = await prisma.dropdownLists.findFirst({});

  if (!dropdownLists) {
    return <div>Something went wrong</div>;
  }

  return (
    <AuthCheck>
      <div className="w-full p-4">
        <GeneratePetitionForm
          parties={dropdownLists.party.filter(
            (p) => p !== "BLK" && p !== "OTH",
          )}
        />
      </div>
    </AuthCheck>
  );
};

export default CommitteeLists;
