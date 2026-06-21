/**
 * Committee Roster View — GET /api/committee/roster
 *
 * Town-level seat roster: every seat (occupied and vacant) across all Election
 * Districts in a scope, flattened to rows. Read-only; never mutates seats.
 * See docs/COMMITTEE_ROSTER_VIEW.md.
 */

import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import type { Prisma, MembershipType } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import prisma from "~/lib/prisma";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import {
  getActiveTermId,
  getGovernanceConfig,
  getUserJurisdictions,
  buildJurisdictionWhere,
} from "~/app/api/lib/committeeValidation";
import { computeDesignationWeightFromData } from "~/lib/designationWeight";
import {
  rosterQuerySchema,
  type CommitteeMembershipSubmissionMetadata,
  type EdRollup,
  type RosterResponse,
  type SeatRosterRow,
} from "~/lib/validations/committee";

// --- Local row-construction types (kept local to the route per the spec) -----

type RosterSeat = {
  seatNumber: number;
  isPetitioned: boolean;
  weight: Prisma.Decimal | number | string | null;
};

type RosterMembership = {
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

type RosterCommittee = {
  id: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  seats: RosterSeat[];
  memberships: RosterMembership[];
};

type BuildOptions = {
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
 * same seat — delegated to computeDesignationWeightFromData, which already
 * detects that condition.
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

    // Throws on duplicate active memberships on one seat AND yields weight data.
    const designation = computeDesignationWeightFromData({
      committeeListId: committee.id,
      termId,
      seats,
      activeMemberships: committee.memberships.map((m) => ({
        seatNumber: m.seatNumber,
        membershipType: m.membershipType,
        voterRecordId: m.voterRecordId,
      })),
    });

    // Map seat -> occupant (safe: compute above already rejected duplicates).
    const occupantBySeat = new Map<number, RosterMembership>();
    const unassignedMembers: RosterMembership[] = [];
    for (const m of committee.memberships) {
      if (m.seatNumber == null) {
        unassignedMembers.push(m);
        continue;
      }
      occupantBySeat.set(m.seatNumber, m);
    }

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

async function getRoster(req: NextRequest, session: SessionWithUser) {
  const queryParams = {
    cityTown: req.nextUrl.searchParams.get("cityTown") ?? "",
    legDistrict: req.nextUrl.searchParams.get("legDistrict") ?? undefined,
    cursor: req.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  };

  const parsed = rosterQuerySchema.safeParse(queryParams);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { cityTown, legDistrict } = parsed.data;

  try {
    const activeTermId = await getActiveTermId();
    const privilegeLevel =
      session.user.privilegeLevel ?? PrivilegeLevel.ReadAccess;
    const isAdmin =
      privilegeLevel === PrivilegeLevel.Admin ||
      privilegeLevel === PrivilegeLevel.Developer;

    // POLICY: Contact info (email/phone) is Admin-only in the roster.
    // Leaders get names at jurisdiction scope (consistent with sign-in sheets)
    // but NOT contact. To expose contact to Leaders, flip this single predicate
    // — do not thread isAdmin elsewhere.
    const includeContact = isAdmin;

    const jurisdictions = await getUserJurisdictions(
      session.user.id,
      activeTermId,
      privilegeLevel,
    );

    // Leader: AND the requested scope with the user's jurisdiction OR-filter.
    // Empty jurisdictions -> { OR: [] } -> matches nothing (correct empty result).
    // Out-of-scope requests AND to no rows (empty roster), so no 403 is needed.
    const where: Prisma.CommitteeListWhereInput = {
      termId: activeTermId,
      cityTown,
      ...(legDistrict !== undefined ? { legDistrict } : {}),
      ...(jurisdictions !== null ? buildJurisdictionWhere(jurisdictions) : {}),
    };

    const committees = await prisma.committeeList.findMany({
      where,
      include: {
        seats: { orderBy: { seatNumber: "asc" } },
        memberships: {
          where: { status: "ACTIVE", termId: activeTermId },
          include: { voterRecord: true },
        },
      },
      orderBy: [
        { cityTown: "asc" },
        { legDistrict: "asc" },
        { electionDistrict: "asc" },
      ],
    });

    const config = await getGovernanceConfig();
    const { rows, edRollups, summary } = buildSeatRosterRows(
      committees as unknown as RosterCommittee[],
      {
        termId: activeTermId,
        maxSeatsPerLted: config.maxSeatsPerLted,
        includeContact,
      },
    );

    const response: RosterResponse = {
      scope: {
        cityTown,
        ...(legDistrict !== undefined ? { legDistrict } : {}),
      },
      rows,
      edRollups,
      summary,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Data integrity error")
    ) {
      Sentry.captureException(error, {
        tags: { route: "committee/roster" },
        extra: { cityTown, legDistrict: legDistrict ?? null },
      });
      console.error("[committee/roster]", error.message);
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    Sentry.captureException(error, {
      tags: { route: "committee/roster" },
      extra: { cityTown, legDistrict: legDistrict ?? null },
    });
    console.error("[committee/roster]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Leader, getRoster);
