import React from "react";
// import { Suspense } from "react";
import CommitteeListSelector from "./CommitteeListPicker";

import prisma from "~/lib/prisma";

const CommitteeLists: React.FC = async () => {
  const committeeLists = await prisma.committeeList.findMany({});
  const dropdownLists = await prisma.dropdownLists.findFirst({});

  if (!committeeLists || !dropdownLists) {
    return <div>Committee Lists not found</div>;
  }

  return (
    <div className="w-full">
      <CommitteeListSelector
        commiitteeLists={committeeLists}
        dropdownLists={dropdownLists}
      />
    </div>
  );
};

export default CommitteeLists;
