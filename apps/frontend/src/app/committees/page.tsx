import React from "react";
import CommitteeListSelector from "./CommitteeListPicker";

import prisma from "~/lib/prisma";
import { hasPermissionFor } from "~/lib/utils";
import { PrivilegeLevel } from "@prisma/client";
import { auth } from "~/auth";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { GeneratePetitionButton } from "./GeneratePetitionButton";

const CommitteeLists: React.FC = async () => {
  const permissions = await auth();
  const committeeLists = await prisma.committeeList.findMany({});
  const dropdownLists = await prisma.dropdownLists.findFirst({});

  let committeeRequests = [];

  if (
    hasPermissionFor(
      permissions?.user?.privilegeLevel ?? PrivilegeLevel.ReadAccess,
      PrivilegeLevel.Admin,
    )
  ) {
    committeeRequests = await prisma.committeeRequest.findMany({});
  }

  if (!committeeLists || !dropdownLists) {
    return <div>Committee Lists not found</div>;
  }

  return (
    <div className="w-full">
      <GeneratePetitionButton parties={dropdownLists.party} />
      {committeeRequests.length > 0 && (
        <div className="flex gap-2 items-center pb-4">
          <h1>
            There are {committeeRequests.length} pending committee requests
          </h1>
          <Link href="/committees/requests">
            <Button>View Requests</Button>
          </Link>
        </div>
      )}
      <CommitteeListSelector
        commiitteeLists={committeeLists}
        dropdownLists={dropdownLists}
      />
    </div>
  );
};

export default CommitteeLists;
