import React from "react";
// import { Suspense } from "react";
import ElectionDistrictSelector from "./CommitteeListPicker";

import prisma from "~/lib/prisma";

const CommitteeLists: React.FC = async () => {
  const electionDistricts = await prisma.electionDistrict.findMany({});

  return (
    <div className="w-full">
      <ElectionDistrictSelector electionDistricts={electionDistricts} />
    </div>
  );
};

export default CommitteeLists;
