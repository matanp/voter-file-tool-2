import type { CommitteeList } from "@prisma/client";

/** A city/LD roster scope — what leaders think of as "their committee". */
export type CommitteeScope = Pick<CommitteeList, "cityTown" | "legDistrict">;

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
