import { auth } from "~/auth";
import { hasPermissionFor } from "~/lib/utils";
import { PrivilegeLevel, type CommitteeList } from "@prisma/client";
import prisma from "~/lib/prisma";
import {
  getActiveTermId,
  getUserJurisdictions,
  buildJurisdictionWhere,
} from "~/app/api/lib/committeeValidation";

export interface ScopedReportPageData {
  privilegeLevel: PrivilegeLevel;
  isLeaderOrAbove: boolean;
  committeeLists: CommitteeList[];
}

/** Load auth, gate, and jurisdiction-scoped committee lists for scoped report pages. */
export async function loadScopedReportPageData(): Promise<ScopedReportPageData> {
  const permissions = await auth();

  const privilegeLevel =
    permissions?.user?.privilegeLevel ?? PrivilegeLevel.ReadAccess;

  const isLeaderOrAbove = hasPermissionFor(
    privilegeLevel,
    PrivilegeLevel.Leader,
  );

  if (!isLeaderOrAbove) {
    return {
      privilegeLevel,
      isLeaderOrAbove: false,
      committeeLists: [],
    };
  }

  const activeTermId = await getActiveTermId();

  if (privilegeLevel === PrivilegeLevel.Leader) {
    const userId = permissions?.user?.id;
    if (userId == null) {
      return {
        privilegeLevel,
        isLeaderOrAbove: true,
        committeeLists: [],
      };
    }

    const jurisdictions = await getUserJurisdictions(
      userId,
      activeTermId,
      privilegeLevel,
    );

    if (!Array.isArray(jurisdictions) || jurisdictions.length === 0) {
      return {
        privilegeLevel,
        isLeaderOrAbove: true,
        committeeLists: [],
      };
    }

    const committeeLists = await prisma.committeeList.findMany({
      where: {
        termId: activeTermId,
        ...buildJurisdictionWhere(jurisdictions),
      },
    });

    return {
      privilegeLevel,
      isLeaderOrAbove: true,
      committeeLists,
    };
  }

  const committeeLists = await prisma.committeeList.findMany({
    where: { termId: activeTermId },
  });

  return {
    privilegeLevel,
    isLeaderOrAbove: true,
    committeeLists,
  };
}
