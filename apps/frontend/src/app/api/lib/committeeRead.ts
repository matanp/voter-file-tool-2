/**
 * Single-committee read helpers shared by `GET /api/fetchCommitteeList`
 * (retired in plan §11) and `GET /api/committee/[committeeListId]/detail`.
 *
 * Both routes load one CommitteeList with its ACTIVE memberships and seats,
 * gate Leaders on jurisdiction (SRS 3.1), and compute the SRS 2.7
 * designation-weight summary from the loaded rows. Keeping the three pieces
 * here means the detail route composes the same data `fetchCommitteeList`
 * returns today rather than a parallel copy.
 */

import type { Prisma, PrivilegeLevel } from "@prisma/client";
import {
  ACTIVE_MEMBERSHIP_STATUS,
  committeeMatchesJurisdictions,
  getUserJurisdictions,
} from "~/app/api/lib/committeeValidation";
import { computeDesignationWeightFromData } from "~/lib/designationWeight";
import type { DesignationWeightSummary } from "~/lib/validations/committee";

/**
 * SRS 1.2 / 1.4 — ACTIVE memberships (with voter data) and seats in seat order.
 * Both routes pass this as `include` so their payload types stay narrow.
 */
export function activeCommitteeInclude(termId: string) {
  return {
    memberships: {
      where: { status: ACTIVE_MEMBERSHIP_STATUS, termId },
      include: { voterRecord: true },
    },
    seats: { orderBy: { seatNumber: "asc" } },
  } satisfies Prisma.CommitteeListInclude;
}

/**
 * SRS 3.1 — true when the caller may read this committee: Admin/Developer
 * always; Leader only when one of their jurisdictions for the term covers it.
 */
export async function canAccessCommittee(params: {
  userId: string;
  privilegeLevel: PrivilegeLevel;
  termId: string;
  committee: { cityTown: string; legDistrict: number };
}): Promise<boolean> {
  const { userId, privilegeLevel, termId, committee } = params;
  const jurisdictions = await getUserJurisdictions(
    userId,
    termId,
    privilegeLevel,
  );
  if (jurisdictions === null) return true;
  return committeeMatchesJurisdictions(
    committee.cityTown,
    committee.legDistrict,
    jurisdictions,
  );
}

type WeightSummaryCommittee = {
  id: number;
  seats: Array<{
    seatNumber: number;
    isPetitioned: boolean;
    weight: Prisma.Decimal | number | string | null;
  }>;
  memberships: Array<{
    seatNumber: number | null;
    membershipType: string | null;
    voterRecordId: string;
  }>;
};

/**
 * SRS 2.7 — designation-weight summary from already-loaded seats and ACTIVE
 * memberships. Throws a "Data integrity error" (409 at the route) when two
 * active memberships claim one seat.
 */
export function buildDesignationWeightSummary(
  committee: WeightSummaryCommittee,
  termId: string,
): DesignationWeightSummary {
  return computeDesignationWeightFromData({
    committeeListId: committee.id,
    termId,
    seats: committee.seats,
    activeMemberships: committee.memberships.map((m) => ({
      seatNumber: m.seatNumber,
      membershipType: m.membershipType,
      voterRecordId: m.voterRecordId,
    })),
  });
}
