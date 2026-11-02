/**
 * Scope checks shared by the Exit Report endpoints. Uses the session's
 * *actual* privilege (skills/auth-check-patterns).
 */

import { PrivilegeLevel } from "@prisma/client";
import {
  committeeMatchesJurisdictions,
  getUserJurisdictions,
} from "~/app/api/lib/committeeValidation";

/** 409 body text when a conditional exit / report write finds the row changed. */
export const MEMBER_CHANGED_MESSAGE = "This member changed, refresh.";

/**
 * SRS 3.1, as `requestAdd` applies it: a Leader may act only on committees in
 * their jurisdictions for the term. Other roles that reach a RequestAccess+
 * route are not jurisdiction-scoped here, matching `requestAdd`.
 */
export async function leaderMayActOnCommittee(params: {
  userId: string;
  privilegeLevel: PrivilegeLevel;
  termId: string;
  committee: { cityTown: string; legDistrict: number };
}): Promise<boolean> {
  const { userId, privilegeLevel, termId, committee } = params;
  if (privilegeLevel !== PrivilegeLevel.Leader) return true;
  const jurisdictions = await getUserJurisdictions(
    userId,
    termId,
    PrivilegeLevel.Leader,
  );
  return committeeMatchesJurisdictions(
    committee.cityTown,
    committee.legDistrict,
    jurisdictions ?? [],
  );
}
