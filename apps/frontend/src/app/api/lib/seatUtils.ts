/**
 * SRS 1.4 — Seat model utilities: creation, assignment, and weight computation.
 */

import {
  type CommitteeMembership,
  type MembershipStatus,
  type MembershipType,
  Prisma,
} from "@prisma/client";
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
 * New seats get the committee's LTED weight, so they don't show as missing a
 * weight until the next recompute.
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
    const committee = await db.committeeList.findUnique({
      where: { id: committeeListId },
      select: { ltedWeight: true },
    });
    const weight = seatWeightFromLted(committee?.ltedWeight ?? null);
    await db.seat.createMany({
      data: toCreate.map((row) => ({
        ...row,
        isPetitioned: false,
        weight,
      })),
      skipDuplicates: true,
    });
  }
}

async function findOccupiedSeats(
  db: SeatUtilsClient,
  committeeListId: number,
  termId: string,
): Promise<Set<number>> {
  const occupied = await db.committeeMembership.findMany({
    where: {
      committeeListId,
      termId,
      status: ACTIVE_MEMBERSHIP_STATUS,
      seatNumber: { not: null },
    },
    select: { seatNumber: true },
  });
  return new Set(
    occupied.map((m) => m.seatNumber).filter((n): n is number => n !== null),
  );
}

function firstFreeSeat(
  occupied: Set<number>,
  maxSeats: number,
  committeeListId: number,
  termId: string,
): number {
  for (let n = 1; n <= maxSeats; n++) {
    if (!occupied.has(n)) return n;
  }
  throw new Error(
    `All ${maxSeats} seats are occupied for committee ${committeeListId} term ${termId}`,
  );
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
  const occupied = await findOccupiedSeats(db, committeeListId, termId);
  return firstFreeSeat(occupied, maxSeats, committeeListId, termId);
}

/**
 * Recomputes Seat.weight for all seats in the committee: each seat's weight is
 * the committee's LTED weight. Clears weights if ltedWeight is null.
 */
export async function recomputeSeatWeights(
  committeeListId: number,
  options?: Pick<SeatUtilsOptions, "tx">,
): Promise<void> {
  const db = (options?.tx ?? prisma) as SeatUtilsClient;
  const committee = await db.committeeList.findUnique({
    where: { id: committeeListId },
    select: { ltedWeight: true },
  });

  if (!committee) return;

  await db.seat.updateMany({
    where: { committeeListId },
    data: { weight: seatWeightFromLted(committee.ltedWeight) },
  });
}

/**
 * Seat weight = the committee's LTED weight, which is already per seat (the
 * weighted table's `Weighted Vote`); null when the LTED weight is unknown.
 */
export function seatWeightFromLted(
  ltedWeight: Prisma.Decimal.Value | null,
): Prisma.Decimal | null {
  return ltedWeight != null ? new Prisma.Decimal(ltedWeight) : null;
}

/** The seat an ACTIVE membership was just written into, and how its member got it. */
export type SeatedMembership = Pick<
  CommitteeMembership,
  "committeeListId" | "termId" | "seatNumber" | "membershipType"
>;

/** Statuses a petition outcome leaves a non-winner in; their petitionSeatNumber was never won. */
const PETITION_NON_WINNER_STATUSES: ReadonlySet<MembershipStatus> = new Set([
  "PETITIONED_LOST",
  "PETITIONED_TIE",
]);

type PreviousSeat = {
  /** The seat the membership last held, when it can be determined. */
  seatNumber: number | null;
  /** Whether the membership was ever ACTIVE before this activation. */
  everActivated: boolean;
};

/**
 * Where a membership being reactivated sat before: its seatNumber, else the seat it won by
 * petition, else the seat on its latest MEMBER_ACTIVATED audit row. Bulk removal and
 * resubmission null seatNumber (and activatedAt), so the audit log is the last record.
 */
async function findPreviousSeat(
  tx: Prisma.TransactionClient,
  existing: CommitteeMembership,
): Promise<PreviousSeat> {
  const wonPetitionSeat = PETITION_NON_WINNER_STATUSES.has(existing.status)
    ? null
    : existing.petitionSeatNumber;
  const rowSeat = existing.seatNumber ?? wonPetitionSeat;
  if (rowSeat !== null) return { seatNumber: rowSeat, everActivated: true };

  const activations = await tx.auditLog.findMany({
    where: {
      entityType: "CommitteeMembership",
      entityId: existing.id,
      action: "MEMBER_ACTIVATED",
    },
    orderBy: { timestamp: "desc" },
    select: { afterValue: true },
  });
  let auditSeat: number | null = null;
  for (const { afterValue } of activations) {
    if (
      afterValue !== null &&
      typeof afterValue === "object" &&
      !Array.isArray(afterValue) &&
      typeof afterValue.seatNumber === "number"
    ) {
      auditSeat = afterValue.seatNumber;
      break;
    }
  }
  return {
    seatNumber: auditSeat,
    everActivated: existing.activatedAt !== null || activations.length > 0,
  };
}

type SeatChoice = {
  seatNumber: number;
  /** Whether this seat may be flagged petitioned for a PETITIONED member. */
  mayFlag: boolean;
  reusedPreviousSeat: boolean;
};

/**
 * One petition winner flags at most one seat, and a petitioned seat stays petitioned after
 * its winner leaves. So:
 *  - a row already ACTIVE in a seat keeps it (and it may be flagged: it's their seat);
 *  - a first activation takes the next free seat, which may be flagged;
 *  - a returning PETITIONED member goes back to their previous seat if it's free (flag
 *    allowed, normally already set); if it's taken or unknown they take the next free
 *    seat, which is NOT flagged, since their petitioned seat is the old one.
 * Non-PETITIONED members take the next free seat (the flag doesn't apply to them).
 */
async function chooseActivationSeat(
  tx: Prisma.TransactionClient,
  input: MembershipActivationInput,
): Promise<SeatChoice> {
  const { existing, committeeListId, termId, maxSeats } = input;
  if (
    existing?.status === ACTIVE_MEMBERSHIP_STATUS &&
    existing.seatNumber !== null
  ) {
    return {
      seatNumber: existing.seatNumber,
      mayFlag: true,
      reusedPreviousSeat: false,
    };
  }

  const occupied = await findOccupiedSeats(
    tx as SeatUtilsClient,
    committeeListId,
    termId,
  );
  const nextFree = () =>
    firstFreeSeat(occupied, maxSeats, committeeListId, termId);

  if (input.membershipType !== "PETITIONED" || existing === null) {
    return { seatNumber: nextFree(), mayFlag: true, reusedPreviousSeat: false };
  }

  const previous = await findPreviousSeat(tx, existing);
  if (
    previous.seatNumber !== null &&
    previous.seatNumber >= 1 &&
    previous.seatNumber <= maxSeats &&
    !occupied.has(previous.seatNumber)
  ) {
    return {
      seatNumber: previous.seatNumber,
      mayFlag: true,
      reusedPreviousSeat: true,
    };
  }
  return {
    seatNumber: nextFree(),
    mayFlag: !previous.everActivated,
    reusedPreviousSeat: false,
  };
}

/**
 * Marks the seat as won by petition for the term; does nothing unless the member is
 * PETITIONED. It only ever sets the flag. Idempotent. Returns whether it changed the seat.
 *
 * Not exported: activations go through activateMembershipInSeat, so the seat rule and the
 * flag can't be skipped on a new path.
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

/** Fields the activation sets itself: status, the seat, and how the member got it. */
type ActivationOwnedFields =
  | "status"
  | "seatNumber"
  | "membershipType"
  | "committeeListId"
  | "termId";

export type MembershipActivationInput = {
  committeeListId: number;
  termId: string;
  maxSeats: number;
  membershipType: MembershipType;
} & (
  | {
      /** The row for this voter, committee and term, written in place. */
      existing: CommitteeMembership;
      data: Omit<
        Prisma.CommitteeMembershipUncheckedUpdateInput,
        ActivationOwnedFields | "voterRecordId"
      >;
    }
  | {
      existing: null;
      data: Omit<
        Prisma.CommitteeMembershipUncheckedCreateInput,
        ActivationOwnedFields
      >;
    }
);

export type MembershipActivation = {
  membership: CommitteeMembership;
  seatNumber: number;
  /** True when this activation flagged the seat petitioned (it wasn't already). */
  seatPetitioned: boolean;
  /** True when a returning PETITIONED member was put back in their previous seat. */
  reusedPreviousSeat: boolean;
};

/**
 * The one write that makes a membership ACTIVE in a seat. It chooses the seat
 * (chooseActivationSeat), writes the row ACTIVE with that seat and type (updating
 * `existing`, or creating a row), then flags the seat petitioned when the rule allows.
 * Callers record the outcome in their MEMBER_ACTIVATED audit row via
 * seatActivationAuditMetadata. The caller checks capacity first; this throws when full.
 */
export async function activateMembershipInSeat(
  tx: Prisma.TransactionClient,
  input: MembershipActivationInput,
): Promise<MembershipActivation> {
  const choice = await chooseActivationSeat(tx, input);
  const owned = {
    status: ACTIVE_MEMBERSHIP_STATUS,
    seatNumber: choice.seatNumber,
    membershipType: input.membershipType,
  };
  const membership =
    input.existing !== null
      ? await tx.committeeMembership.update({
          where: { id: input.existing.id },
          data: { ...input.data, ...owned },
        })
      : await tx.committeeMembership.create({
          data: {
            ...input.data,
            committeeListId: input.committeeListId,
            termId: input.termId,
            ...owned,
          },
        });
  const seatPetitioned = choice.mayFlag
    ? await markSeatPetitioned(tx, membership)
    : false;
  return {
    membership,
    seatNumber: choice.seatNumber,
    seatPetitioned,
    reusedPreviousSeat: choice.reusedPreviousSeat,
  };
}

/**
 * Audit metadata for an activation: `seatPetitioned: true` when it flagged its seat, and
 * `reusedPreviousSeat: true` when it put a returning member back in their old seat; each
 * omitted otherwise. Spread into the activation's MEMBER_ACTIVATED metadata.
 */
export function seatActivationAuditMetadata(
  activation: Pick<MembershipActivation, "seatPetitioned" | "reusedPreviousSeat">,
): { seatPetitioned?: true; reusedPreviousSeat?: true } {
  return {
    ...(activation.seatPetitioned ? { seatPetitioned: true as const } : {}),
    ...(activation.reusedPreviousSeat
      ? { reusedPreviousSeat: true as const }
      : {}),
  };
}
