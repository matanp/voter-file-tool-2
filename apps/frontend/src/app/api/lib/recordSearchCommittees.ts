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
import { PrivilegeLevel, type Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";
import {
  ACTIVE_MEMBERSHIP_STATUS,
  buildJurisdictionWhere,
  findActiveTerm,
  getUserJurisdictions,
} from "~/app/api/lib/committeeValidation";
import { hasPermissionFor } from "~/lib/utils";
import type { RecordSearchCommittee } from "~/lib/validations/recordSearch";

/** What the lookup reads from each membership. */
export const RECORD_SEARCH_MEMBERSHIP_SELECT = {
  voterRecordId: true,
  committeeList: {
    select: {
      id: true,
      cityTown: true,
      legDistrict: true,
      electionDistrict: true,
    },
  },
} satisfies Prisma.CommitteeMembershipSelect;

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
  // Leader and up only. `getUserJurisdictions` doesn't check the role: it
  // returns whatever jurisdiction rows exist, so a ReadAccess user left with
  // rows from when they were a Leader would otherwise get badges.
  if (
    voterRecordIds.length === 0 ||
    privilegeLevel === undefined ||
    !hasPermissionFor(privilegeLevel, PrivilegeLevel.Leader)
  ) {
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
    select: RECORD_SEARCH_MEMBERSHIP_SELECT,
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
