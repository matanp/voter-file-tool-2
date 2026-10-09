import type { EdRollup, RosterSummary } from "~/lib/validations/committee";

/**
 * Folds rollups into a summary. The single copy of this fold: the roster route
 * uses it for the scope-wide `summary`, and the committees workspace grid uses
 * it for per-town section counts. Pure and dependency-free so it is safe to
 * import from client components.
 */
export function summarizeEdRollups(rollups: EdRollup[]): RosterSummary {
  let totalSeats = 0;
  let filled = 0;
  let unassignedCount = 0;
  let pendingCount = 0;
  for (const r of rollups) {
    totalSeats += r.totalSeats;
    filled += r.filled;
    unassignedCount += r.unassignedCount;
    pendingCount += r.pendingCount;
  }
  return {
    totalSeats,
    filled,
    vacant: totalSeats - filled,
    edCount: rollups.length,
    unassignedCount,
    pendingCount,
    activeMemberCount: filled + unassignedCount,
  };
}
