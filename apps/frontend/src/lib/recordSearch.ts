/**
 * Record search response extras (POST /api/fetchFilteredData).
 *
 * `activeCommittee` is the committee a voter is an ACTIVE member of in the
 * active term (ticket 08). The server adds it only when the request sets
 * `includeCommittee` (record search does; other callers of the route don't)
 * and the caller's real role may see that committee's roster: Admin and
 * Developer for any committee, a Leader for committees in their assignments.
 * Otherwise the key is absent, never null, so a ReadAccess response carries
 * no membership data at all.
 *
 * Plain types: the client does not parse the response (see the note on
 * `RecordSearchResult`).
 */
import type { VoterRecord } from "@prisma/client";
import {
  committeeLabelParts,
  type CommitteeRef,
} from "~/lib/committees/committeeRef";

export type RecordSearchCommittee = CommitteeRef;

/**
 * A record search row as the record search page holds it. The response is
 * not parsed, so the date fields arrive as strings despite the `VoterRecord`
 * type (`convertPrismaVoterRecordToAPI`); that predates ticket 08.
 */
export type RecordSearchResult = VoterRecord & {
  activeCommittee?: RecordSearchCommittee;
};

/**
 * The badge read aloud: "Committee member: GREECE, Legislative District 1,
 * Election District 5" (no LD part when the visual label drops it).
 */
export function recordSearchCommitteeSpokenLabel(
  committee: RecordSearchCommittee,
): string {
  return `Committee member: ${committeeLabelParts(committee, { spelledOut: true }).join(", ")}`;
}
