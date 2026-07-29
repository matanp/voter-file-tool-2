/**
 * SRS 2.7 — Designation-weight calculation engine.
 *
 * Determines how much weight a committee contributes based on
 * petitioned seats and current occupancy.
 */

import { Prisma } from "@prisma/client";
import {
  computeDesignationWeight,
  type DesignationWeightResult,
  type SeatContribution,
} from "@voter-file-tool/shared-prisma";
import prisma from "~/lib/prisma";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";

// Re-exported for existing consumers; the rule itself lives in shared-prisma.
export type { SeatContribution, DesignationWeightResult };

type ComputationSeatInput = {
  seatNumber: number;
  isPetitioned: boolean;
  weight: Prisma.Decimal | number | string | null;
};

type ComputationMembershipInput = {
  seatNumber: number | null;
  membershipType: string | null;
  voterRecordId: string;
};

type ComputeDesignationWeightInput = {
  committeeListId: number;
  termId: string;
  seats: ComputationSeatInput[];
  activeMemberships: ComputationMembershipInput[];
  seatOccupants?: Map<number, ComputationMembershipInput>;
};

/**
 * Adapter around the shared `computeDesignationWeight` engine, preserving the
 * frontend's `{ committeeListId, termId, seats, activeMemberships }` call shape.
 * All number conversion happens at the response boundary (return object).
 */
export function computeDesignationWeightFromData(
  input: ComputeDesignationWeightInput,
): DesignationWeightResult {
  const { committeeListId, termId, seats, activeMemberships, seatOccupants } =
    input;

  return computeDesignationWeight({
    seats,
    memberships: activeMemberships,
    context: { committeeListId, termId },
    seatOccupants,
  });
}

/**
 * Calculates the designation weight for a committee in a given term.
 *
 * Rules:
 * - Only `Seat.isPetitioned=true` seats can contribute.
 * - A petitioned seat contributes only when occupied by an ACTIVE membership
 *   with matching `seatNumber`.
 * - Vacant petitioned seats contribute zero.
 * - Appointed members in petitioned seats contribute the full seat weight.
 * - Members in non-petitioned seats contribute zero.
 * - If a petitioned seat has `weight=null`, it is excluded from the total
 *   and its seatNumber is captured in `missingWeightSeatNumbers`.
 */
export async function calculateDesignationWeight(
  committeeListId: number,
  termId?: string,
): Promise<DesignationWeightResult> {
  const resolvedTermId = termId ?? (await getActiveTermId());

  const [seats, activeMemberships] = await Promise.all([
    prisma.seat.findMany({
      where: { committeeListId, termId: resolvedTermId },
      orderBy: { seatNumber: "asc" },
    }),
    prisma.committeeMembership.findMany({
      where: {
        committeeListId,
        termId: resolvedTermId,
        status: "ACTIVE",
        seatNumber: { not: null },
      },
      select: {
        seatNumber: true,
        membershipType: true,
        voterRecordId: true,
      },
    }),
  ]);

  return computeDesignationWeightFromData({
    committeeListId,
    termId: resolvedTermId,
    seats,
    activeMemberships,
  });
}
