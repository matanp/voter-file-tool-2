import type { MembershipType } from "@prisma/client";

import type { SeatRosterRow } from "~/lib/validations/committee";

/**
 * Everything a roster row shows about petitioning, in one place.
 *
 * Whether the Petitioned/Appointed distinction and the petitioned-vacancy
 * marker count as "petition references" that Leaders must not see is still
 * open (leader-petition-visibility/01, group C). Until it is answered, every
 * roster surface (the workspace Roster tab and the town roster table) renders
 * these fields only through this helper, so the eventual change is one edit
 * here (for example, taking the acting privilege and collapsing the
 * distinction for Leaders).
 */
export type SeatPetitionDisplay = {
  /** Occupant's membership type ("Petitioned" / "Appointed"), or "—". */
  membershipTypeLabel: string;
  /** Text for the member column when the seat is vacant; null when occupied. */
  vacancyLabel: string | null;
  /** Vacant petitioned seat: rendered with a highlight in addition to the text. */
  petitionedVacant: boolean;
};

/**
 * Whether the membership type (Petitioned / Appointed) is shown anywhere: the
 * roster tables' Type column and the committee member card's badge. Hidden for
 * now; the data and rendering stay wired up so flipping this back to true
 * restores them.
 */
export const SHOW_MEMBERSHIP_TYPE = false;

const MEMBERSHIP_TYPE_LABEL: Record<MembershipType, string> = {
  PETITIONED: "Petitioned",
  APPOINTED: "Appointed",
};

export function seatPetitionDisplay(row: SeatRosterRow): SeatPetitionDisplay {
  const type = row.occupant?.membershipType ?? null;
  const petitionedVacant =
    row.occupant === null && row.petitionedVacant === true;
  return {
    membershipTypeLabel: type ? MEMBERSHIP_TYPE_LABEL[type] : "—",
    vacancyLabel:
      row.occupant !== null
        ? null
        : petitionedVacant
          ? "— petitioned vacant —"
          : "— vacant —",
    petitionedVacant,
  };
}
