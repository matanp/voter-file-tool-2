import type { LeaderAssignment } from "~/lib/loadScopedReportPageData";

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(
      /(^|[\s-])(\S)/g,
      (_match, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`,
    );
}

/** "Rochester – LD 22" for an LD assignment, "Brighton" for a town-wide one. */
export function formatLeaderAssignmentLabel(
  assignment: LeaderAssignment,
): string {
  const place = toTitleCase(assignment.cityTown);
  return assignment.legDistrict != null
    ? `${place} – LD ${assignment.legDistrict}`
    : place;
}
