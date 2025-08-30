import React from "react";

import prisma from "~/lib/prisma";
import { hasPermissionFor } from "~/lib/utils";
import { CommitteeList, PrivilegeLevel } from "@prisma/client";
import { auth } from "~/auth";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import CommitteeSelector from "./CommitteeSelector";
import { mapCommiteesToReportShape } from "./committeeUtils";

const CommitteeLists: React.FC = async () => {
  const permissions = await auth();
  const committeeLists: CommitteeList[] = await prisma.committeeList.findMany({
    include: {
      committeeMemberList: true,
    },
  });

  // console.log(JSON.stringify(committeeLists.slice(100, 102)));

  console.log(
    JSON.stringify(mapCommiteesToReportShape(committeeLists.slice(0, 10))),
  );
  const dropdownLists = await prisma.dropdownLists.findFirst({});

  let committeeRequests = [];

  const isAdminUser = hasPermissionFor(
    permissions?.user?.privilegeLevel ?? PrivilegeLevel.ReadAccess,
    PrivilegeLevel.Admin,
  );

  if (isAdminUser) {
    committeeRequests = await prisma.committeeRequest.findMany({});
  }

  if (!committeeLists || !dropdownLists) {
    return <div>Committee Lists not found</div>;
  }

  return (
    <div className="w-full p-4">
      {isAdminUser && (
        <div className="flex gap-4 mb-4">
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
          <Button>Hello world</Button>
        </div>
      )}
      <CommitteeSelector commiitteeLists={committeeLists} />
    </div>
  );
};

export default CommitteeLists;
