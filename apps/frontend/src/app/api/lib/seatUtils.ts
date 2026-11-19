/**
 * SRS 1.4 — Seat model utilities: creation, assignment, and weight computation.
 */

import { type CommitteeMembership, Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";
import { getGovernanceConfig, ACTIVE_MEMBERSHIP_STATUS } from "./committeeValidation";
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
      status: ACTIVE_MEMBERSHIP_STATUS,
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

  await db.seat.updateMany({
    where: { committeeListId },
    data: { weight: computeSeatWeight(committee.ltedWeight, maxSeats) },
  });
}

/** Seat weight = ltedWeight / maxSeatsPerLted; null when the LTED weight is unknown. */
export function computeSeatWeight(
  ltedWeight: Prisma.Decimal.Value | null,
  maxSeats: number,
): Prisma.Decimal | null {
  return ltedWeight != null ? new Prisma.Decimal(ltedWeight).div(maxSeats) : null;
}

/** The seat an ACTIVE membership was just written into, and how its member got it. */
export type SeatedMembership = Pick<
  CommitteeMembership,
  "committeeListId" | "termId" | "seatNumber" | "membershipType"
>;

/**
 * Marks the seat as won by petition for the term; does nothing unless the member is
 * PETITIONED. It only ever sets the flag: a petitioned seat stays petitioned after its
 * member leaves, so Vacancy and Weight reports keep counting it. Idempotent. Returns
 * whether it changed the seat.
 *
 * Not exported: activations go through activateMembershipInSeat, so the flag can't be
 * forgotten on a new path.
 */
async function markSeatPetitioned(
  tx: Prisma.TransactionClient,
  membership: SeatedMembership,
): Promise<boolean> {
  if (
    membership.membershipType !== "PETITIONED" ||
    membership.seatNumber === null
  ) {
    return false;
  }
  const { count } = await tx.seat.updateMany({
    where: {
      committeeListId: membership.committeeListId,
      termId: membership.termId,
      seatNumber: membership.seatNumber,
      isPetitioned: false,
    },
    data: { isPetitioned: true },
  });
  return count > 0;
}

type ActivationUpdateData = Omit<
  Prisma.CommitteeMembershipUncheckedUpdateInput,
  "status"
>;
type ActivationCreateData = Omit<
  Prisma.CommitteeMembershipUncheckedCreateInput,
  "status"
>;

/** Reactivate (or rewrite) an existing row, or create a new one; the status is always ACTIVE. */
export type MembershipActivationWrite =
  | {
      update: {
        where: Prisma.CommitteeMembershipWhereUniqueInput;
        data: ActivationUpdateData;
      };
    }
  | { create: ActivationCreateData };

export type MembershipActivation = {
  membership: CommitteeMembership;
  /** True when this activation flagged the seat petitioned (it wasn't already). */
  seatPetitioned: boolean;
};

/**
 * The one write that makes a membership ACTIVE in a seat: writes the row with status
 * ACTIVE, then flags the seat petitioned when the member is PETITIONED. Callers record
 * `seatPetitioned` in their activation audit row via seatPetitionedAuditMetadata.
 */
export async function activateMembershipInSeat(
  tx: Prisma.TransactionClient,
  write: MembershipActivationWrite,
): Promise<MembershipActivation> {
  const membership =
    "update" in write
      ? await tx.committeeMembership.update({
          where: write.update.where,
          data: { ...write.update.data, status: ACTIVE_MEMBERSHIP_STATUS },
        })
      : await tx.committeeMembership.create({
          data: { ...write.create, status: ACTIVE_MEMBERSHIP_STATUS },
        });
  const seatPetitioned = await markSeatPetitioned(tx, membership);
  return { membership, seatPetitioned };
}

/**
 * Audit metadata for an activation: `{ seatPetitioned: true }` when it flagged its seat,
 * nothing otherwise. Spread into the activation's MEMBER_ACTIVATED metadata.
 */
export function seatPetitionedAuditMetadata(
  activation: Pick<MembershipActivation, "seatPetitioned">,
): { seatPetitioned?: true } {
  return activation.seatPetitioned ? { seatPetitioned: true } : {};
}
