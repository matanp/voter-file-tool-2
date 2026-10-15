import { PrivilegeLevel } from "@prisma/client";

import { hasPermissionFor } from "~/lib/utils";
import {
  updateLtedWeightSchema,
  type DesignationWeightSummary,
} from "~/lib/validations/committee";

/**
 * Display rules for the Seats & Weight tab. No weight math happens here: the
 * totals, contributions and missing-weight seats all come from the server's
 * designation-weight engine (via `detail.rollup` and
 * `detail.designationWeightSummary`); this module only formats them and
 * decides what the acting role sees.
 */

export type SeatsWeightVisibility = {
  /**
   * The LTED total-weight editor, which also shows the current LTED weight
   * (`updateLtedWeight` is Admin-only on the server).
   */
  canEditLtedWeight: boolean;
  /**
   * Petition detail: the per-seat breakdown (whether each seat is petitioned)
   * and the word "petitioned" in the missing-weight warning.
   *
   * Whether the petitioned-seat distinction counts as a "petition reference"
   * that Leaders must not see is still open (leader-petition-visibility/01,
   * group C). Until it is answered, Leaders get what the old detail showed
   * them (vacancy, designation weight, seats filled, and which seat numbers
   * lack a weight, with no "petitioned" label), and this is the one place to
   * change it.
   */
  showPetitionDetail: boolean;
};

/** Client visibility only (skills/auth-check-patterns): pass `actingPermissions`. */
export function seatsWeightVisibility(
  actingPermissions: PrivilegeLevel,
): SeatsWeightVisibility {
  const isAdmin = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);
  return { canEditLtedWeight: isAdmin, showPetitionDetail: isAdmin };
}

/**
 * The warning text for seats missing a weight, or null when there are none.
 * `petitioned` names them as petitioned seats (see `showPetitionDetail`).
 */
export function missingWeightWarning(
  seatNumbers: number[],
  { petitioned }: { petitioned: boolean },
): string | null {
  if (seatNumbers.length === 0) return null;
  const kind = petitioned ? "petitioned seat" : "seat";
  const seats =
    seatNumbers.length === 1
      ? `${kind} ${seatNumbers[0]} has`
      : `${kind}s ${seatNumbers.join(", ")} have`;
  return `Weight incomplete: ${seats} no weight, so the designation weight is not shown.`;
}

type BreakdownSeat = DesignationWeightSummary["seats"][number];

export type SeatBreakdownRow = {
  seatNumber: number;
  petitioned: string;
  occupied: string;
  seatWeight: string;
  contribution: string;
};

export function seatBreakdownRow(seat: BreakdownSeat): SeatBreakdownRow {
  const missingWeight = seat.isPetitioned && seat.seatWeight === null;
  return {
    seatNumber: seat.seatNumber,
    petitioned: seat.isPetitioned ? "Yes" : "No",
    occupied: seat.isOccupied ? "Yes" : "No",
    seatWeight:
      seat.seatWeight !== null ? seat.seatWeight.toFixed(4) : missingWeight ? "Missing" : "—",
    contribution: seat.contributes
      ? seat.contributionWeight.toFixed(4)
      : missingWeight
        ? "—"
        : "0.0000",
  };
}

export type LtedWeightParse =
  | { ok: true; value: number | null }
  | { ok: false; error: string };

/**
 * Parses the LTED total-weight field: blank clears the weight; otherwise the
 * number must pass the server's own `updateLtedWeightSchema` field rule.
 */
export function parseLtedWeightInput(text: string): LtedWeightParse {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, value: null };
  const parsed = updateLtedWeightSchema.shape.ltedWeight.safeParse(Number(trimmed));
  if (!parsed.success || parsed.data === null) {
    return { ok: false, error: "LTED weight must be a non-negative number." };
  }
  return { ok: true, value: parsed.data };
}
