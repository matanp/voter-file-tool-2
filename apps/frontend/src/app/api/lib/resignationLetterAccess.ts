/**
 * Who may open a Resignation Letter (ticket 08 decision 4). Uses the
 * session's *actual* privilege (skills/auth-check-patterns).
 *
 * - Admins (and Developers): always.
 * - Everyone else who can read the committee: only while the letter belongs
 *   to a pending resignation Exit Report. Once the resignation is recorded the
 *   letter is Admin-only: it holds the member's signature and details.
 */
import { PrivilegeLevel } from "@prisma/client";
import { canAccessCommittee } from "~/app/api/lib/committeeRead";

export function isActualAdmin(level: PrivilegeLevel | undefined): boolean {
  return level === PrivilegeLevel.Admin || level === PrivilegeLevel.Developer;
}

export type LetterViewDecision = "allowed" | "forbidden";

export async function letterViewAccess(params: {
  viewer: { userId: string; privilegeLevel: PrivilegeLevel };
  membership: {
    status: string;
    exitReportedKind: string | null;
    termId: string;
    committeeList: { cityTown: string; legDistrict: number };
  };
}): Promise<LetterViewDecision> {
  const { viewer, membership } = params;
  if (isActualAdmin(viewer.privilegeLevel)) return "allowed";
  const pending =
    membership.status === "ACTIVE" &&
    membership.exitReportedKind === "RESIGNATION";
  if (!pending) return "forbidden";
  const inScope = await canAccessCommittee({
    userId: viewer.userId,
    privilegeLevel: viewer.privilegeLevel,
    termId: membership.termId,
    committee: membership.committeeList,
  });
  return inScope ? "allowed" : "forbidden";
}
