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
  canAccessPage: boolean;
  committeeLists: CommitteeList[];
}

export interface LoadScopedReportPageOptions {
  /**
   * Minimum actual privilege for the page. Defaults to Leader; never lower.
   * Set explicitly per page (e.g. Admin for Petition Outcomes) rather than
   * derived from the UI registry's display-only `minPrivilege`.
   */
  minPagePrivilege?: typeof PrivilegeLevel.Leader | typeof PrivilegeLevel.Admin;
}

/** Load auth, gate, and jurisdiction-scoped committee lists for scoped report pages. */
export async function loadScopedReportPageData(
  options: LoadScopedReportPageOptions = {},
): Promise<ScopedReportPageData> {
  const permissions = await auth();

  const privilegeLevel =
    permissions?.user?.privilegeLevel ?? PrivilegeLevel.ReadAccess;

  const canAccessPage = hasPermissionFor(
    privilegeLevel,
    options.minPagePrivilege ?? PrivilegeLevel.Leader,
  );

  if (!canAccessPage) {
    return {
      privilegeLevel,
      canAccessPage: false,
      committeeLists: [],
    };
  }

  const activeTermId = await getActiveTermId();

  if (privilegeLevel === PrivilegeLevel.Leader) {
    const userId = permissions?.user?.id;
    if (userId == null) {
      return {
        privilegeLevel,
        canAccessPage: true,
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
        canAccessPage: true,
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
      canAccessPage: true,
      committeeLists,
    };
  }

  const committeeLists = await prisma.committeeList.findMany({
    where: { termId: activeTermId },
  });

  return {
    privilegeLevel,
    canAccessPage: true,
    committeeLists,
  };
}
