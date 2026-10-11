import type { CommitteeList } from "@prisma/client";

/** A city/LD roster scope — what leaders think of as "their committee". */
export type CommitteeScope = Pick<CommitteeList, "cityTown" | "legDistrict">;

/**
 * The CommitteeList fields CommitteeSelector reads. Full rows carry
 * `ltedWeight` (a Prisma Decimal), which can't cross the Server → Client
 * boundary, so the page selects only these.
 */
export const committeeSelectorListSelect = {
  id: true,
  cityTown: true,
  legDistrict: true,
  electionDistrict: true,
  termId: true,
} as const;

export type CommitteeSelectorList = Pick<
  CommitteeList,
  keyof typeof committeeSelectorListSelect
>;

/** The one (cityTown, legDistrict) scope the lists cover, or null if 0 or 2+. */
export function singleCommitteeScope(
  lists: CommitteeScope[],
): CommitteeScope | null {
  const scopes = new Map<string, CommitteeScope>();
  for (const list of lists) {
    scopes.set(`${list.cityTown}|${list.legDistrict}`, {
      cityTown: list.cityTown,
      legDistrict: list.legDistrict,
    });
  }
  if (scopes.size !== 1) return null;
  return scopes.values().next().value ?? null;
}
