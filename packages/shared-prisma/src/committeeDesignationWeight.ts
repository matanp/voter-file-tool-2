/**
 * SRS 2.7 — Designation-weight calculation engine (single source of truth).
 *
 * The seat-weight / contribution rule is legally meaningful, so it lives here
 * once and is consumed by both the frontend (add / roster flows) and the
 * report-server (weight-summary report). Callers fetch their own data and
 * adapt it to the input shapes below; this module is pure and DB-agnostic.
 */
import { Prisma } from '@prisma/client';

export type OccupantMembershipType = 'PETITIONED' | 'APPOINTED' | null;

export type SeatContribution = {
  seatNumber: number;
  isPetitioned: boolean;
  isOccupied: boolean;
  occupantMembershipType: OccupantMembershipType;
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

export type DesignationSeatInput = {
  seatNumber: number;
  isPetitioned: boolean;
  weight: Prisma.Decimal | number | string | null;
};

export type DesignationMembershipInput = {
  seatNumber: number | null;
  membershipType: string | null;
};

/** Identifying context, used only to enrich the duplicate-seat error message. */
export type DesignationWeightContext = {
  committeeListId?: number | string;
  termId?: string;
};

export type ComputeDesignationWeightInput = {
  seats: DesignationSeatInput[];
  memberships: DesignationMembershipInput[];
  context?: DesignationWeightContext;
  /** Pre-indexed occupants; when omitted, built from memberships. */
  seatOccupants?: Map<number, DesignationMembershipInput>;
};

/**
 * Narrows a raw membershipType to the occupant types the weight rule cares
 * about. Must be kept in sync with the Prisma `MembershipType` enum: if a new
 * member type is added there, decide explicitly whether it maps to an occupant
 * type here — otherwise it silently normalizes to `null`.
 */
function normalizeMembershipType(
  membershipType: string | null,
): OccupantMembershipType {
  if (membershipType === 'PETITIONED' || membershipType === 'APPOINTED') {
    return membershipType;
  }
  return null;
}

/**
 * Indexes active memberships by seat number, throwing a deterministic
 * "Data integrity error" when two active memberships claim the same seat.
 * Shared so no caller rebuilds (and risks diverging) this mapping or its
 * integrity check. Members with a null seatNumber (unassigned) are skipped.
 */
export function indexActiveMembershipsBySeat<
  M extends { seatNumber: number | null },
>(memberships: M[], context: DesignationWeightContext = {}): Map<number, M> {
  const bySeat = new Map<number, M>();
  for (const m of memberships) {
    if (m.seatNumber == null) continue;
    if (bySeat.has(m.seatNumber)) {
      const forCommittee =
        context.committeeListId != null
          ? ` for committee ${String(context.committeeListId)}`
          : '';
      const forTerm = context.termId != null ? ` term ${context.termId}` : '';
      throw new Error(
        `Data integrity error: duplicate active memberships on seat ${String(
          m.seatNumber,
        )}${forCommittee}${forTerm}`,
      );
    }
    bySeat.set(m.seatNumber, m);
  }
  return bySeat;
}

/**
 * Computes the designation-weight breakdown for one committee.
 *
 * Rules:
 * - Only `isPetitioned` seats can contribute.
 * - A petitioned seat contributes its full weight only when occupied by an
 *   active membership (PETITIONED or APPOINTED); vacant petitioned seats
 *   contribute zero.
 * - Members in non-petitioned seats contribute zero.
 * - A petitioned seat with `weight=null` is excluded from the total and its
 *   seatNumber is captured in `missingWeightSeatNumbers`.
 *
 * All Decimal math happens here; numbers are emitted only at the boundary.
 * Seats are processed (and returned) in ascending seatNumber order.
 */
export function computeDesignationWeight(
  input: ComputeDesignationWeightInput,
): DesignationWeightResult {
  const { seats, memberships, context, seatOccupants: prebuiltOccupants } =
    input;

  const seatOccupants =
    prebuiltOccupants ??
    indexActiveMembershipsBySeat(memberships, context ?? {});

  const orderedSeats = [...seats].sort((a, b) => a.seatNumber - b.seatNumber);

  const missingWeightSeatNumbers: number[] = [];
  let totalWeightDecimal = new Prisma.Decimal(0);
  let totalContributingSeats = 0;

  const seatContributions: SeatContribution[] = orderedSeats.map((seat) => {
    const occupant = seatOccupants.get(seat.seatNumber) ?? null;
    const isOccupied = occupant !== null;
    const occupantMembershipType = normalizeMembershipType(
      occupant?.membershipType ?? null,
    );
    const seatWeightDecimal =
      seat.weight != null ? new Prisma.Decimal(seat.weight) : null;

    // Non-petitioned seats never contribute.
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

    // Petitioned seat with null weight — exclude from total, track in metadata.
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

    // Petitioned seat: contributes its full weight only when occupied.
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
