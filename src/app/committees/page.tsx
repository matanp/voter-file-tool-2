import React from "react";
// import { Suspense } from "react";
import CommitteeListSelector from "./CommitteeListPicker";

import prisma from "~/lib/prisma";

const CommitteeLists: React.FC = async () => {
  const committeeLists = await prisma.committeeList.findMany({});

  return (
    <div className="w-full">
      <CommitteeListSelector commiitteeLists={committeeLists} />
    </div>
  );
};

export default CommitteeLists;
