/**
 * Pure grid model for the committees workspace: filtering, town grouping, and
 * reconciling URL filters/selection against what the caller can actually see.
 * No vacancy/weight math lives here — rows are the server's `EdRollup`s and
 * section counts fold them with the shared `summarizeEdRollups`.
 */
import { summarizeEdRollups } from "~/lib/summarizeEdRollups";
import type {
  EdRollup,
  RosterFilters,
  RosterSummary,
} from "~/lib/validations/committee";

/** Filters the grid applies. `town`/`ld` live in the URL; the rest are local. */
export type CommitteeGridFilters = {
  town: string | null;
  ld: number | null;
  /** ED number (exact) or part of a town name. */
  query: string;
  onlyOpenSeats: boolean;
  onlyPending: boolean;
  onlyMissingWeight: boolean;
};

export const EMPTY_GRID_FILTERS: CommitteeGridFilters = {
  town: null,
  ld: null,
  query: "",
  onlyOpenSeats: false,
  onlyPending: false,
  onlyMissingWeight: false,
};

export type CommitteeTownGroup = {
  town: string;
  rollups: EdRollup[];
  summary: RosterSummary;
  /** True when the town's visible committees span more than one LD. */
  multipleLegDistricts: boolean;
};

/** "NORTH CHILI" → "North Chili" for display; the stored value stays uppercase. */
export function formatTownName(town: string): string {
  return town.toLowerCase().replace(/(^|[\s'-])\w/g, (m) => m.toUpperCase());
}

export function openSeats(rollup: EdRollup): number {
  return Math.max(0, rollup.totalSeats - rollup.filled);
}

function matchesQuery(rollup: EdRollup, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  if (/^\d+$/.test(q)) return rollup.electionDistrict === Number(q);
  return rollup.cityTown.toLowerCase().includes(q);
}

export function filterRollups(
  rollups: EdRollup[],
  filters: CommitteeGridFilters,
): EdRollup[] {
  return rollups.filter(
    (r) =>
      (filters.town === null || r.cityTown === filters.town) &&
      (filters.ld === null || r.legDistrict === filters.ld) &&
      matchesQuery(r, filters.query) &&
      (!filters.onlyOpenSeats || openSeats(r) > 0) &&
      (!filters.onlyPending || r.pendingCount > 0) &&
      (!filters.onlyMissingWeight || r.missingWeightSeatNumbers.length > 0),
  );
}

/** Groups rollups by town, preserving the server's (town, LD, ED) order. */
export function groupRollupsByTown(rollups: EdRollup[]): CommitteeTownGroup[] {
  const byTown = new Map<string, EdRollup[]>();
  for (const r of rollups) {
    const group = byTown.get(r.cityTown);
    if (group) group.push(r);
    else byTown.set(r.cityTown, [r]);
  }
  return Array.from(byTown, ([town, group]) => ({
    town,
    rollups: group,
    summary: summarizeEdRollups(group),
    multipleLegDistricts: new Set(group.map((r) => r.legDistrict)).size > 1,
  }));
}

/** LDs offered for a town (all LDs in scope when no town is chosen). */
export function legDistrictsForTown(
  filters: RosterFilters,
  town: string | null,
): number[] {
  const lds = new Set<number>();
  for (const pair of filters.legDistricts) {
    if (town === null || pair.cityTown === town) lds.add(pair.legDistrict);
  }
  return Array.from(lds).sort((a, b) => a - b);
}

/**
 * Corrections that bring URL state back inside what the caller can see, once
 * the whole grid has loaded: a town or LD outside the caller's scope is
 * dropped, and a committee that is not among the visible rows is cleared (the
 * desktop fallback then selects the first visible committee). Returns null
 * when nothing needs to change.
 */
export function reconcileUrlState(
  url: { committeeId: number | null; town: string | null; ld: number | null },
  scope: RosterFilters,
  visible: EdRollup[],
): { committee?: null; town?: null; ld?: null } | null {
  const patch: { committee?: null; town?: null; ld?: null } = {};
  const townValid = url.town === null || scope.towns.includes(url.town);
  if (!townValid) {
    patch.town = null;
  }
  if (
    url.ld !== null &&
    !legDistrictsForTown(scope, townValid ? url.town : null).includes(url.ld)
  ) {
    patch.ld = null;
  }
  if (
    url.committeeId !== null &&
    !visible.some((r) => r.committeeListId === url.committeeId)
  ) {
    patch.committee = null;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}
