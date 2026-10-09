/**
 * Row-construction logic for the Committee Roster View (GET /api/committee/roster).
 *
 * Extracted from route.ts so the route module only exports route handlers
 * (Next.js route files may only export handlers + allowed configs).
 * See docs/COMMITTEE_ROSTER_VIEW.md.
 *
 * Two layers, so the grid can price the whole scope without seat rows:
 * - `buildEdRollup` / `buildEdRollups` / `summarizeEdRollups` need only the
 *   lean committee shape (seats + active-membership seat numbers) and hold the
 *   single copy of the vacancy / weight math.
 * - `buildSeatRosterRows` layers per-seat rows (names, optional contact) on
 *   top of the same rollups for the committees that carry voter records.
 */

import type { Prisma, MembershipType } from "@prisma/client";
import { indexActiveMembershipsBySeat } from "@voter-file-tool/shared-prisma";
import { computeDesignationWeightFromData } from "~/lib/designationWeight";
// Client-safe fold (the workspace grid uses it for per-town counts); re-exported
// so the route keeps importing it from here.
import { summarizeEdRollups } from "~/lib/summarizeEdRollups";
import type {
  CommitteeMembershipSubmissionMetadata,
  EdRollup,
  RosterResponse,
  SeatRosterRow,
} from "~/lib/validations/committee";

export { summarizeEdRollups };

// --- Local row-construction types --------------------------------------------

export type RosterSeat = {
  seatNumber: number;
  isPetitioned: boolean;
  weight: Prisma.Decimal | number | string | null;
};

/** What the rollup math needs from an ACTIVE membership. */
export type RosterMembershipCore = {
  seatNumber: number | null;
  membershipType: MembershipType | null;
  voterRecordId: string;
};

/** What seat rows additionally need (name + contact source). */
export type RosterMembership = RosterMembershipCore & {
  submissionMetadata: Prisma.JsonValue | null;
  voterRecord: {
    VRCNUM: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    telephone: string | null;
  };
};

/**
 * Committee input for rollups. `memberships` must be the ACTIVE memberships
 * for the term; `pendingCount` is the number of SUBMITTED memberships for the
 * term (defaults to 0 for callers that do not fetch it).
 */
export type RosterCommitteeCore<
  M extends RosterMembershipCore = RosterMembershipCore,
> = {
  id: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  seats: RosterSeat[];
  memberships: M[];
  pendingCount?: number;
};

export type RosterCommittee = RosterCommitteeCore<RosterMembership>;

export type RollupOptions = {
  termId: string;
  maxSeatsPerLted: number;
};

export type BuildOptions = RollupOptions & {
  includeContact: boolean;
};

function serializeWeight(
  weight: Prisma.Decimal | number | string | null,
): string | null {
  return weight == null ? null : weight.toString();
}

type EdRollupBuild<M extends RosterMembershipCore> = {
  rollup: EdRollup;
  /** Persisted seats, or synthesized vacant seats when none are persisted. */
  seats: RosterSeat[];
  occupantBySeat: Map<number, M>;
  unassignedMembers: M[];
};

/**
 * Rollup for one committee: seat count (synthesizing `maxSeatsPerLted` virtual
 * vacant seats in memory, read-only, when no Seat records exist), occupied /
 * unassigned counts, pending count, and designation weight.
 *
 * Throws a "Data integrity error" (surfaced as 409 by the route) when two
 * active memberships claim the same seat — via indexActiveMembershipsBySeat /
 * computeDesignationWeightFromData.
 */
export function buildEdRollup<M extends RosterMembershipCore>(
  committee: RosterCommitteeCore<M>,
  options: RollupOptions,
): EdRollupBuild<M> {
  const { termId, maxSeatsPerLted } = options;

  const seats: RosterSeat[] =
    committee.seats.length > 0
      ? committee.seats
      : Array.from({ length: maxSeatsPerLted }, (_, i) => ({
          seatNumber: i + 1,
          isPetitioned: false,
          weight: null,
        }));

  // Index occupants once; shared with the weight engine to avoid duplicate work.
  const occupantBySeat = indexActiveMembershipsBySeat(committee.memberships, {
    committeeListId: committee.id,
    termId,
  });
  const unassignedMembers = committee.memberships.filter(
    (m) => m.seatNumber == null,
  );

  const designation = computeDesignationWeightFromData({
    committeeListId: committee.id,
    termId,
    seats,
    activeMemberships: committee.memberships.map((m) => ({
      seatNumber: m.seatNumber,
      membershipType: m.membershipType,
      voterRecordId: m.voterRecordId,
    })),
    seatOccupants: occupantBySeat,
  });

  let filled = 0;
  for (const seat of seats) {
    if (occupantBySeat.has(seat.seatNumber)) filled += 1;
  }

  return {
    rollup: {
      committeeListId: committee.id,
      cityTown: committee.cityTown,
      legDistrict: committee.legDistrict,
      electionDistrict: committee.electionDistrict,
      filled,
      totalSeats: seats.length,
      unassignedCount: unassignedMembers.length,
      pendingCount: committee.pendingCount ?? 0,
      designationWeight: designation.totalWeight,
      missingWeightSeatNumbers: designation.missingWeightSeatNumbers,
    },
    seats,
    occupantBySeat,
    unassignedMembers,
  };
}

/** Rollups for every committee, in input order. */
export function buildEdRollups(
  committees: RosterCommitteeCore[],
  options: RollupOptions,
): EdRollup[] {
  return committees.map((c) => buildEdRollup(c, options).rollup);
}

/**
 * Flattens committees into seat rows + per-ED rollups + a summary over the
 * committees given. Read-only; never writes via ensureSeatsExist.
 */
export function buildSeatRosterRows(
  committees: RosterCommittee[],
  options: BuildOptions,
): Required<Pick<RosterResponse, "rows" | "edRollups" | "summary">> {
  const { includeContact } = options;

  const rows: SeatRosterRow[] = [];
  const edRollups: EdRollup[] = [];

  for (const committee of committees) {
    const { rollup, seats, occupantBySeat, unassignedMembers } = buildEdRollup(
      committee,
      options,
    );

    const buildContact = (m: RosterMembership) => {
      const meta = m.submissionMetadata as
        | CommitteeMembershipSubmissionMetadata
        | null
        | undefined;
      return {
        email: meta?.email ?? m.voterRecord.email,
        phone: meta?.phone ?? m.voterRecord.telephone,
      };
    };

    const baseRow = (seatNumber: number | null) => ({
      committeeListId: committee.id,
      cityTown: committee.cityTown,
      legDistrict: committee.legDistrict,
      electionDistrict: committee.electionDistrict,
      seatNumber,
    });

    for (const seat of seats) {
      const occupant = occupantBySeat.get(seat.seatNumber) ?? null;
      const isVacant = occupant === null;

      const row: SeatRosterRow = {
        ...baseRow(seat.seatNumber),
        isPetitioned: seat.isPetitioned,
        weight: serializeWeight(seat.weight),
        occupant: occupant
          ? {
              VRCNUM: occupant.voterRecord.VRCNUM,
              firstName: occupant.voterRecord.firstName ?? "",
              lastName: occupant.voterRecord.lastName ?? "",
              membershipType: occupant.membershipType,
            }
          : null,
      };
      if (isVacant && seat.isPetitioned) row.petitionedVacant = true;
      if (includeContact && occupant) row.contact = buildContact(occupant);
      rows.push(row);
    }

    // Unassigned active members — emitted so members never vanish from the table.
    for (const m of unassignedMembers) {
      const row: SeatRosterRow = {
        ...baseRow(null),
        isPetitioned: false,
        weight: null,
        unassigned: true,
        occupant: {
          VRCNUM: m.voterRecord.VRCNUM,
          firstName: m.voterRecord.firstName ?? "",
          lastName: m.voterRecord.lastName ?? "",
          membershipType: m.membershipType,
        },
      };
      if (includeContact) row.contact = buildContact(m);
      rows.push(row);
    }

    edRollups.push(rollup);
  }

  return { rows, edRollups, summary: summarizeEdRollups(edRollups) };
}
