/**
 * Committee membership for record search results (ticket 08).
 *
 * Record search is open to ReadAccess, but a voter's committee seat is roster
 * data: only someone who could see that committee's roster may learn it. The
 * scope comes from the caller's real session role (never `actingPermissions`):
 *
 * - Admin / Developer: every committee.
 * - Leader: committees in their active-term jurisdictions (a null LD covers
 *   the whole town); none when they have no jurisdictions.
 * - RequestAccess / ReadAccess: no lookup at all.
 *
 * Only ACTIVE memberships in the active term count. A voter holds at most one
 * of those (partial unique index), so each record maps to one committee.
 */
import { PrivilegeLevel } from "@prisma/client";
import prisma from "~/lib/prisma";
import {
  ACTIVE_MEMBERSHIP_STATUS,
  buildJurisdictionWhere,
  findActiveTerm,
  getUserJurisdictions,
} from "~/app/api/lib/committeeValidation";
import type { RecordSearchCommittee } from "~/lib/validations/recordSearch";

type CommitteeViewerLevel =
  | typeof PrivilegeLevel.Developer
  | typeof PrivilegeLevel.Admin
  | typeof PrivilegeLevel.Leader;

/**
 * True when this real role may see some committee rosters. An explicit list
 * rather than `hasPermissionFor`, so a new role is denied until added here.
 */
function mayViewCommittees(
  privilegeLevel: PrivilegeLevel | undefined,
): privilegeLevel is CommitteeViewerLevel {
  switch (privilegeLevel) {
    case PrivilegeLevel.Developer:
    case PrivilegeLevel.Admin:
    case PrivilegeLevel.Leader:
      return true;
    default:
      return false;
  }
}

/**
 * The committee each voter in `voterRecordIds` is an ACTIVE member of, keyed
 * by VRCNUM, limited to committees the caller may see. Voters without a
 * visible membership are absent. Returns an empty map for a caller who may
 * see no committees, or when there is no active term.
 */
export async function activeCommitteesForRecords(
  voterRecordIds: string[],
  user: { id: string; privilegeLevel?: PrivilegeLevel },
): Promise<Map<string, RecordSearchCommittee>> {
  const result = new Map<string, RecordSearchCommittee>();
  const { privilegeLevel } = user;
  if (voterRecordIds.length === 0 || !mayViewCommittees(privilegeLevel)) {
    return result;
  }

  const term = await findActiveTerm();
  if (!term) return result;

  const jurisdictions = await getUserJurisdictions(
    user.id,
    term.id,
    privilegeLevel,
  );
  if (jurisdictions !== null && jurisdictions.length === 0) return result;

  const memberships = await prisma.committeeMembership.findMany({
    where: {
      voterRecordId: { in: voterRecordIds },
      termId: term.id,
      status: ACTIVE_MEMBERSHIP_STATUS,
      committeeList: {
        termId: term.id,
        ...(jurisdictions !== null
          ? buildJurisdictionWhere(jurisdictions)
          : {}),
      },
    },
    select: {
      voterRecordId: true,
      committeeList: {
        select: {
          id: true,
          cityTown: true,
          legDistrict: true,
          electionDistrict: true,
        },
      },
    },
  });

  for (const { voterRecordId, committeeList } of memberships) {
    result.set(voterRecordId, {
      committeeListId: committeeList.id,
      cityTown: committeeList.cityTown,
      legDistrict: committeeList.legDistrict,
      electionDistrict: committeeList.electionDistrict,
    });
  }
  return result;
}
