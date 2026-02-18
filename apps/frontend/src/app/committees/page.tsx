import React from "react";

import prisma from "~/lib/prisma";
import { hasPermissionFor } from "~/lib/utils";
import { PrivilegeLevel } from "@prisma/client";
import { auth } from "~/auth";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import CommitteeSelector from "./CommitteeSelector";
import { GenerateCommitteeReportButton } from "./GenerateCommitteeReportButton";
import type { CommitteeWithMembers } from "@voter-file-tool/shared-validators";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";

const CommitteeLists = async () => {
  const permissions = await auth();

  const isAdminUser = hasPermissionFor(
    permissions?.user?.privilegeLevel ?? PrivilegeLevel.ReadAccess,
    PrivilegeLevel.Admin,
  );

  const activeTermId = await getActiveTermId();

  // Only include PII data for admin users; filter by active term (SRS §5.1)
  const committeeLists: CommitteeWithMembers[] =
    await prisma.committeeList.findMany({
      where: { termId: activeTermId },
    });

  const dropdownLists = await prisma.dropdownLists.findFirst({});

  // SRS 1.2 — Count SUBMITTED CommitteeMemberships instead of CommitteeRequests
  let pendingRequestCount = 0;
  if (isAdminUser) {
    pendingRequestCount = await prisma.committeeMembership.count({
      where: { status: "SUBMITTED", termId: activeTermId },
    });
  }

  if (!committeeLists || !dropdownLists) {
    return <div>Committee Lists not found</div>;
  }

  return (
    <div className="w-full p-4">
      {isAdminUser && (
        <div className="flex gap-4 mb-4">
          {pendingRequestCount > 0 && (
            <div className="flex gap-4 items-center pb-4">
              <h1>
                There are {pendingRequestCount} pending committee requests
              </h1>
              <Link href="/committees/requests">
                <Button>View Requests</Button>
              </Link>
            </div>
          )}
          <GenerateCommitteeReportButton />
        </div>
      )}
      <CommitteeSelector committeeLists={committeeLists} />
    </div>
  );
};

export default CommitteeLists;
