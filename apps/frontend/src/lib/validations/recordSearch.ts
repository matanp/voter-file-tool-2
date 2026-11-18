/**
 * Record search response extras (POST /api/fetchFilteredData).
 *
 * `activeCommittee` is the committee a voter is an ACTIVE member of in the
 * active term (ticket 08). The server adds it only when the caller's real
 * role may see that committee's roster: Admin and Developer for any
 * committee, a Leader for committees in their jurisdictions. Otherwise the
 * key is absent, never null, so a ReadAccess response carries no membership
 * data at all.
 */
import { z } from "zod";
import type { VoterRecord } from "@prisma/client";

export const recordSearchCommitteeSchema = z.object({
  committeeListId: z.number().int(),
  cityTown: z.string(),
  legDistrict: z.number().int(),
  electionDistrict: z.number().int(),
});
export type RecordSearchCommittee = z.infer<typeof recordSearchCommitteeSchema>;

/** A record search row as the record search page holds it. */
export type RecordSearchResult = VoterRecord & {
  activeCommittee?: RecordSearchCommittee;
};

/** "GREECE · LD 1 · ED 5" (no LD for towns without one, as on the roster). */
export function recordSearchCommitteeLabel(
  committee: RecordSearchCommittee,
): string {
  return [
    committee.cityTown,
    ...(committee.legDistrict > 0 ? [`LD ${committee.legDistrict}`] : []),
    `ED ${committee.electionDistrict}`,
  ].join(" · ");
}

/**
 * The badge read aloud: "Committee member: GREECE, Legislative District 1,
 * Election District 5" (no LD part when the visual label drops it).
 */
export function recordSearchCommitteeSpokenLabel(
  committee: RecordSearchCommittee,
): string {
  const parts = [
    committee.cityTown,
    ...(committee.legDistrict > 0
      ? [`Legislative District ${committee.legDistrict}`]
      : []),
    `Election District ${committee.electionDistrict}`,
  ];
  return `Committee member: ${parts.join(", ")}`;
}
