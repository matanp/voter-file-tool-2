/**
 * SRS 1.4 — Seat model utilities: creation, assignment, and weight computation.
 */

import { Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";
import { getGovernanceConfig } from "./committeeValidation";

const ACTIVE_STATUS = "ACTIVE";

/**
 * Ensures maxSeatsPerLted Seat records exist for the given committee+term.
 * Idempotent: creates only missing seats. Call after CommitteeList upsert.
 */
export async function ensureSeatsExist(
  committeeListId: number,
  termId: string,
): Promise<void> {
  const config = await getGovernanceConfig();
  const maxSeats = config.maxSeatsPerLted;

  const existingCount = await prisma.seat.count({
    where: { committeeListId, termId },
  });

  if (existingCount >= maxSeats) return;

  const existingNumbers = await prisma.seat
    .findMany({
      where: { committeeListId, termId },
      select: { seatNumber: true },
    })
    .then((seats) => new Set(seats.map((s) => s.seatNumber)));

  const toCreate: { committeeListId: number; termId: string; seatNumber: number }[] =
    [];
  for (let n = 1; n <= maxSeats; n++) {
    if (!existingNumbers.has(n)) {
      toCreate.push({ committeeListId, termId, seatNumber: n });
    }
  }

  if (toCreate.length > 0) {
    await prisma.seat.createMany({
      data: toCreate.map((row) => ({
        ...row,
        isPetitioned: false,
        weight: null,
      })),
      skipDuplicates: true,
    });
  }
}

/**
 * Returns the smallest available seat number (1-based) for committee+term.
 * Throws if all seats are occupied (capacity check should run before activation).
 */
export async function assignNextAvailableSeat(
  committeeListId: number,
  termId: string,
): Promise<number> {
  const config = await getGovernanceConfig();
  const maxSeats = config.maxSeatsPerLted;

  const occupied = await prisma.committeeMembership.findMany({
    where: {
      committeeListId,
      termId,
      status: ACTIVE_STATUS,
      seatNumber: { not: null },
    },
    select: { seatNumber: true },
  });

  const occupiedSet = new Set(
    occupied.map((m) => m.seatNumber).filter((n): n is number => n !== null),
  );

  for (let n = 1; n <= maxSeats; n++) {
    if (!occupiedSet.has(n)) return n;
  }

  throw new Error(
    `All ${maxSeats} seats are occupied for committee ${committeeListId} term ${termId}`,
  );
}

/**
 * Recomputes Seat.weight for all seats in the committee.
 * weight = ltedWeight / maxSeatsPerLted. Clears weights if ltedWeight is null.
 */
export async function recomputeSeatWeights(
  committeeListId: number,
): Promise<void> {
  const committee = await prisma.committeeList.findUnique({
    where: { id: committeeListId },
    select: { ltedWeight: true },
  });

  if (!committee) return;

  const config = await getGovernanceConfig();
  const maxSeats = config.maxSeatsPerLted;

  const seatWeight =
    committee.ltedWeight != null
      ? new Prisma.Decimal(committee.ltedWeight).div(maxSeats)
      : null;

  await prisma.seat.updateMany({
    where: { committeeListId },
    data: { weight: seatWeight },
  });
}
