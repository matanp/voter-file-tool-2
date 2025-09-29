import type { CommitteeList } from "@prisma/client";
import type { CommitteeSelection } from "~/lib/types/committee";
import { COMMITTEE_CONSTANTS } from "~/lib/constants/committee";
import { LEG_DISTRICT_SENTINEL } from "@voter-file-tool/shared-validators";

/**
 * Get display name for a committee
 * Handles special case for Rochester city
 */
export function getCommitteeDisplayName(committee: CommitteeList): string {
  if (committee.cityTown === COMMITTEE_CONSTANTS.ROCHESTER_CITY) {
    return `${committee.cityTown}, ${committee.legDistrict}, ${committee.electionDistrict}`;
  }
  return `${committee.cityTown}, ${committee.electionDistrict}`;
}

/**
 * Validate committee selection parameters
 * Ensures all required fields are present and valid
 */
export function validateCommitteeSelection(
  selection: Partial<CommitteeSelection>,
): boolean {
  return Boolean(
    selection.city &&
      selection.electionDistrict &&
      (!selection.legDistrict || selection.legDistrict !== ""),
  );
}

/**
 * Check if a committee is at capacity
 */
export function isCommitteeAtCapacity(memberCount: number): boolean {
  return memberCount >= COMMITTEE_CONSTANTS.MAX_MEMBERS;
}

/**
 * Get available slots in a committee
 */
export function getAvailableSlots(memberCount: number): number {
  return Math.max(0, COMMITTEE_CONSTANTS.MAX_MEMBERS - memberCount);
}

/**
 * Format legislative district for display
 * Handles undefined/null values gracefully
 */
export function formatLegislativeDistrict(
  legDistrict?: string | number | null,
): string {
  if (
    legDistrict === undefined ||
    legDistrict === null ||
    legDistrict === "" ||
    legDistrict === LEG_DISTRICT_SENTINEL
  ) {
    return "At-Large";
  }
  return String(legDistrict);
}

/**
 * Check if a city requires legislative district selection
 */
export function requiresLegislativeDistrict(city: string): boolean {
  return city.toUpperCase() === COMMITTEE_CONSTANTS.ROCHESTER_CITY;
}
