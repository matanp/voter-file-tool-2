/**
 * SRS 1.4 — Seat model utilities: creation, assignment, and weight computation.
 */

import { Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";
import { getGovernanceConfig } from "./committeeValidation";

const ACTIVE_STATUS = "ACTIVE";
type SeatUtilsClient = Pick<
  typeof prisma,
  "seat" | "committeeMembership" | "committeeGovernanceConfig" | "committeeList"
>;

type SeatUtilsOptions = {
  tx?: Prisma.TransactionClient;
  maxSeats?: number;
};

async function resolveMaxSeats(
  db: SeatUtilsClient,
  maxSeats?: number,
): Promise<number> {
  if (typeof maxSeats === "number") return maxSeats;
  const config =
    db === prisma
      ? await getGovernanceConfig()
      : await db.committeeGovernanceConfig.findFirst();

  if (!config) {
    throw new Error("CommitteeGovernanceConfig not found — run seed");
  }

  return config.maxSeatsPerLted;
}

/**
 * Ensures maxSeatsPerLted Seat records exist for the given committee+term.
 * Idempotent: creates only missing seats. Call after CommitteeList upsert.
 */
export async function ensureSeatsExist(
  committeeListId: number,
  termId: string,
  options?: SeatUtilsOptions,
): Promise<void> {
  const db = (options?.tx ?? prisma) as SeatUtilsClient;
  const maxSeats = await resolveMaxSeats(db, options?.maxSeats);

  const existingCount = await db.seat.count({
    where: { committeeListId, termId },
  });

  if (existingCount >= maxSeats) return;

  const existingNumbers = await db.seat
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
    await db.seat.createMany({
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
  options?: SeatUtilsOptions,
): Promise<number> {
  const db = (options?.tx ?? prisma) as SeatUtilsClient;
  const maxSeats = await resolveMaxSeats(db, options?.maxSeats);

  const occupied = await db.committeeMembership.findMany({
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
  options?: Pick<SeatUtilsOptions, "tx" | "maxSeats">,
): Promise<void> {
  const db = (options?.tx ?? prisma) as SeatUtilsClient;
  const committee = await db.committeeList.findUnique({
    where: { id: committeeListId },
    select: { ltedWeight: true },
  });

  if (!committee) return;

  const maxSeats = await resolveMaxSeats(db, options?.maxSeats);

  const seatWeight =
    committee.ltedWeight != null
      ? new Prisma.Decimal(committee.ltedWeight).div(maxSeats)
      : null;

  await db.seat.updateMany({
    where: { committeeListId },
    data: { weight: seatWeight },
  });
}
