import { PrivilegeLevel } from "@prisma/client";

import { hasPermissionFor } from "~/lib/utils";
import type { DesignationWeightSummary, EdRollup } from "~/lib/validations/committee";

/**
 * Display rules for the Seats & Weight tab. No weight math happens here: the
 * totals, contributions and missing-weight seats all come from the server's
 * designation-weight engine (via `detail.rollup` and
 * `detail.designationWeightSummary`); this module only formats them and
 * decides what the acting role sees.
 */

export type SeatsWeightVisibility = {
  /** The LTED total-weight editor (`updateLtedWeight` is Admin-only on the server). */
  canEditLtedWeight: boolean;
  /**
   * The per-seat breakdown, including whether each seat is petitioned.
   *
   * Whether the petitioned-seat distinction counts as a "petition reference"
   * that Leaders must not see is still open (leader-petition-visibility/01,
   * group C). Until it is answered, Leaders get what they get today (the
   * summary, not the breakdown), and this is the one place to change it.
   */
  showSeatBreakdown: boolean;
};

/** Client visibility only (skills/auth-check-patterns): pass `actingPermissions`. */
export function seatsWeightVisibility(
  actingPermissions: PrivilegeLevel,
): SeatsWeightVisibility {
  const isAdmin = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);
  return { canEditLtedWeight: isAdmin, showSeatBreakdown: isAdmin };
}

/**
 * "Weight incomplete ≠ zero weight": any petitioned seat without a weight (or
 * a null total) renders an em dash, as on the town roster table.
 */
export function formatDesignationWeight(rollup: EdRollup): string {
  if (rollup.designationWeight === null || rollup.missingWeightSeatNumbers.length > 0) {
    return "—";
  }
  return rollup.designationWeight.toFixed(2);
}

/** The warning text for petitioned seats without a weight, or null when none. */
export function missingWeightWarning(seatNumbers: number[]): string | null {
  if (seatNumbers.length === 0) return null;
  const seats =
    seatNumbers.length === 1
      ? `petitioned seat ${seatNumbers[0]} has`
      : `petitioned seats ${seatNumbers.join(", ")} have`;
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
 * Parses the LTED total-weight field: blank clears the weight; otherwise a
 * finite, non-negative number (the server's `updateLtedWeightSchema` rule).
 */
export function parseLtedWeightInput(text: string): LtedWeightParse {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, value: null };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, error: "LTED weight must be a non-negative number." };
  }
  return { ok: true, value };
}
