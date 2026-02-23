import React from "react";
import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";
import { PrivilegeLevel, type CommitteeList } from "@prisma/client";
import { Card, CardContent } from "~/components/ui/card";
import prisma from "~/lib/prisma";
import {
  getActiveTermId,
  getUserJurisdictions,
  committeeMatchesJurisdictions,
} from "~/app/api/lib/committeeValidation";
import { WeightSummaryForm } from "./WeightSummaryForm";

const WeightSummaryReportsPage = async () => {
  const permissions = await auth();

  const privilegeLevel =
    permissions?.user?.privilegeLevel ?? PrivilegeLevel.ReadAccess;

  const isLeaderOrAbove = hasPermissionFor(
    privilegeLevel,
    PrivilegeLevel.Leader,
  );

  if (!isLeaderOrAbove) {
    return (
      <div className="w-full p-4">
        <Card>
          <CardContent className="pt-6">
            <p>You do not have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeTermId = await getActiveTermId();

  let committeeLists: CommitteeList[] = await prisma.committeeList.findMany({
    where: { termId: activeTermId },
  });

  // SRS 3.1 — Leaders only see committees in their assigned jurisdictions
  if (privilegeLevel === PrivilegeLevel.Leader && permissions?.user?.id) {
    const jurisdictions = await getUserJurisdictions(
      permissions.user.id,
      activeTermId,
      privilegeLevel,
    );
    if (Array.isArray(jurisdictions) && jurisdictions.length > 0) {
      committeeLists = committeeLists.filter((c) =>
        committeeMatchesJurisdictions(c.cityTown, c.legDistrict, jurisdictions),
      );
    } else {
      committeeLists = [];
    }
  }

  return (
    <div className="w-full min-h-screen bg-primary-foreground">
      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="primary-header">Designation Weight Summary Reports</h1>
          <p className="text-muted-foreground mt-2">
            Committee-by-committee breakdown of seat weights, occupancy, and
            total designation weight.
          </p>
        </div>
        <WeightSummaryForm
          committeeLists={committeeLists}
          userPrivilegeLevel={privilegeLevel}
        />
      </div>
    </div>
  );
};

export default WeightSummaryReportsPage;
