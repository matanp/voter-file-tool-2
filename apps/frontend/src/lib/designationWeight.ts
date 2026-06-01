/**
 * SRS 2.7 — Designation-weight calculation engine.
 *
 * Determines how much weight a committee contributes based on
 * petitioned seats and current occupancy.
 */

import { Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";

export type SeatContribution = {
  seatNumber: number;
  isPetitioned: boolean;
  isOccupied: boolean;
  occupantMembershipType: "PETITIONED" | "APPOINTED" | null;
  seatWeight: number | null;
  contributes: boolean;
  contributionWeight: number;
};

export type DesignationWeightResult = {
  totalWeight: number;
  totalContributingSeats: number;
  seats: SeatContribution[];
  missingWeightSeatNumbers: number[];
};

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
};

function normalizeMembershipType(
  membershipType: string | null,
): "PETITIONED" | "APPOINTED" | null {
  if (membershipType === "PETITIONED" || membershipType === "APPOINTED") {
    return membershipType;
  }
  return null;
}

/**
 * Pure computation helper used by multiple routes to avoid duplicate logic.
 * All number conversion happens at response boundary (return object).
 */
export function computeDesignationWeightFromData(
  input: ComputeDesignationWeightInput,
): DesignationWeightResult {
  const { committeeListId, termId, seats, activeMemberships } = input;

  // Check for duplicate active memberships on the same seat
  const seatOccupants = new Map<
    number,
    { membershipType: string | null; voterRecordId: string }
  >();
  for (const m of activeMemberships) {
    if (m.seatNumber == null) continue;
    if (seatOccupants.has(m.seatNumber)) {
      throw new Error(
        `Data integrity error: duplicate active memberships on seat ${String(m.seatNumber)} ` +
          `for committee ${String(committeeListId)} term ${termId}`,
      );
    }
    seatOccupants.set(m.seatNumber, {
      membershipType: m.membershipType,
      voterRecordId: m.voterRecordId,
    });
  }

  const missingWeightSeatNumbers: number[] = [];
  let totalWeightDecimal = new Prisma.Decimal(0);
  let totalContributingSeats = 0;

  const seatContributions: SeatContribution[] = seats.map((seat) => {
    const occupant = seatOccupants.get(seat.seatNumber) ?? null;
    const isOccupied = occupant !== null;
    const occupantMembershipType = normalizeMembershipType(
      occupant?.membershipType ?? null,
    );

    const seatWeightDecimal =
      seat.weight != null ? new Prisma.Decimal(seat.weight) : null;

    // Contribution rules
    if (!seat.isPetitioned) {
      return {
        seatNumber: seat.seatNumber,
        isPetitioned: false,
        isOccupied,
        occupantMembershipType,
        seatWeight: seatWeightDecimal?.toNumber() ?? null,
        contributes: false,
        contributionWeight: 0,
      };
    }

    // Petitioned seat with null weight — exclude from total, track in metadata
    if (seatWeightDecimal == null) {
      missingWeightSeatNumbers.push(seat.seatNumber);
      return {
        seatNumber: seat.seatNumber,
        isPetitioned: true,
        isOccupied,
        occupantMembershipType,
        seatWeight: null,
        contributes: false,
        contributionWeight: 0,
      };
    }

    // Petitioned seat: contributes only when occupied
    const contributes = isOccupied;
    const contributionWeightDecimal = contributes
      ? seatWeightDecimal
      : new Prisma.Decimal(0);

    if (contributes) {
      totalWeightDecimal = totalWeightDecimal.add(contributionWeightDecimal);
      totalContributingSeats += 1;
    }

    return {
      seatNumber: seat.seatNumber,
      isPetitioned: true,
      isOccupied,
      occupantMembershipType,
      seatWeight: seatWeightDecimal.toNumber(),
      contributes,
      contributionWeight: contributionWeightDecimal.toNumber(),
    };
  });

  return {
    totalWeight: totalWeightDecimal.toNumber(),
    totalContributingSeats,
    seats: seatContributions,
    missingWeightSeatNumbers,
  };
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
