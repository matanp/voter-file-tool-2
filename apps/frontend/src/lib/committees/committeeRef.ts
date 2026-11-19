/**
 * A committee named by its composite key, and how it is labelled. Shared by the
 * committees workspace (action drawer) and record search (membership badge).
 */

/**
 * The committee an action targets or a voter sits on: `committeeListId` plus
 * the composite key the mutation endpoints use (plan §3.11, §8).
 */
export type CommitteeRef = {
  committeeListId: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
};

/**
 * Towns without legislative districts carry the sentinel (-1) as their LD in
 * read models; endpoints want it omitted and labels leave it out.
 */
export function hasLegDistrict(
  committee: Pick<CommitteeRef, "legDistrict">,
): boolean {
  return committee.legDistrict > 0;
}

/**
 * The label's parts: ["GREECE", "LD 1", "ED 5"], or spelled out for screen
 * readers: ["GREECE", "Legislative District 1", "Election District 5"]. No LD
 * part for towns without one.
 */
export function committeeLabelParts(
  committee: CommitteeRef,
  { spelledOut = false }: { spelledOut?: boolean } = {},
): string[] {
  const ld = spelledOut ? "Legislative District" : "LD";
  const ed = spelledOut ? "Election District" : "ED";
  return [
    committee.cityTown,
    ...(hasLegDistrict(committee) ? [`${ld} ${committee.legDistrict}`] : []),
    `${ed} ${committee.electionDistrict}`,
  ];
}

/** "GREECE · LD 1 · ED 5" (no LD for towns without one). */
export function committeeLabel(committee: CommitteeRef): string {
  return committeeLabelParts(committee).join(" · ");
}
