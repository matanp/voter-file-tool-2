/**
 * Row-construction logic for the Committee Roster View (GET /api/committee/roster).
 *
 * Extracted from route.ts so the route module only exports route handlers
 * (Next.js route files may only export handlers + allowed configs).
 * See docs/COMMITTEE_ROSTER_VIEW.md.
 */

import type { Prisma, MembershipType } from "@prisma/client";
import { indexActiveMembershipsBySeat } from "@voter-file-tool/shared-prisma";
import { computeDesignationWeightFromData } from "~/lib/designationWeight";
import type {
  CommitteeMembershipSubmissionMetadata,
  EdRollup,
  RosterResponse,
  SeatRosterRow,
} from "~/lib/validations/committee";

// --- Local row-construction types --------------------------------------------

export type RosterSeat = {
  seatNumber: number;
  isPetitioned: boolean;
  weight: Prisma.Decimal | number | string | null;
};

export type RosterMembership = {
  seatNumber: number | null;
  membershipType: MembershipType | null;
  voterRecordId: string;
  submissionMetadata: Prisma.JsonValue | null;
  voterRecord: {
    VRCNUM: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    telephone: string | null;
  };
};

export type RosterCommittee = {
  id: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  seats: RosterSeat[];
  memberships: RosterMembership[];
};

export type BuildOptions = {
  termId: string;
  maxSeatsPerLted: number;
  includeContact: boolean;
};

function serializeWeight(
  weight: Prisma.Decimal | number | string | null,
): string | null {
  return weight == null ? null : weight.toString();
}

/**
 * Flattens committees into seat rows + per-ED rollups + a town-wide summary.
 *
 * Read-only: synthesizes virtual vacant seats in memory when a committee has no
 * Seat records (never writes via ensureSeatsExist). Throws a "Data integrity
 * error" (surfaced as 409 by the route) when two active memberships claim the
 * same seat — via indexActiveMembershipsBySeat / computeDesignationWeightFromData.
 */
export function buildSeatRosterRows(
  committees: RosterCommittee[],
  options: BuildOptions,
): Pick<RosterResponse, "rows" | "edRollups" | "summary"> {
  const { termId, maxSeatsPerLted, includeContact } = options;

  const rows: SeatRosterRow[] = [];
  const edRollups: EdRollup[] = [];

  let summaryTotalSeats = 0;
  let summaryFilled = 0;
  let summaryUnassigned = 0;

  for (const committee of committees) {
    // Seat synthesis (in-memory, read-only) when no Seat records exist.
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

    let filled = 0;
    for (const seat of seats) {
      const occupant = occupantBySeat.get(seat.seatNumber) ?? null;
      const isVacant = occupant === null;
      if (!isVacant) filled += 1;

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

    edRollups.push({
      electionDistrict: committee.electionDistrict,
      legDistrict: committee.legDistrict,
      filled,
      totalSeats: seats.length,
      unassignedCount: unassignedMembers.length,
      designationWeight: designation.totalWeight,
      missingWeightSeatNumbers: designation.missingWeightSeatNumbers,
    });

    summaryTotalSeats += seats.length;
    summaryFilled += filled;
    summaryUnassigned += unassignedMembers.length;
  }

  return {
    rows,
    edRollups,
    summary: {
      totalSeats: summaryTotalSeats,
      filled: summaryFilled,
      vacant: summaryTotalSeats - summaryFilled,
      edCount: committees.length,
      unassignedCount: summaryUnassigned,
    },
  };
}
