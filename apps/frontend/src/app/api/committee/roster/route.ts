/**
 * Committee Roster View / grid read model — GET /api/committee/roster
 *
 * One paginated call returns every committee in the caller's scope as an
 * `EdRollup` (grid row), a scope-wide `summary`, the filter values available
 * to the caller, and — unless `includeRows=false` — every seat (occupied and
 * vacant) flattened to rows. Read-only; never mutates seats.
 * See docs/COMMITTEE_ROSTER_VIEW.md and
 * docs/SRS/COMMITTEES_WORKSPACE_UI_IMPLEMENTATION_PLAN.md §5 "Grid".
 */

import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import prisma from "~/lib/prisma";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import {
  ACTIVE_MEMBERSHIP_STATUS,
  PENDING_MEMBERSHIP_STATUS,
  getActiveTermId,
  getGovernanceConfig,
  getUserJurisdictions,
  buildJurisdictionWhere,
} from "~/app/api/lib/committeeValidation";
import {
  buildEdRollups,
  buildSeatRosterRows,
  summarizeEdRollups,
  type RosterCommittee,
  type RosterCommitteeCore,
} from "./buildSeatRosterRows";
import {
  rosterQuerySchema,
  type EdRollup,
  type RosterFilters,
  type RosterResponse,
} from "~/lib/validations/committee";

/** Grid order; also the cursor order. The triple is unique within a term. */
const ROSTER_ORDER: Prisma.CommitteeListOrderByWithRelationInput[] = [
  { cityTown: "asc" },
  { legDistrict: "asc" },
  { electionDistrict: "asc" },
];

/** Distinct (cityTown, legDistrict) pairs → filter values, in grid order. */
function toFilters(
  pairs: Array<{ cityTown: string; legDistrict: number }>,
): RosterFilters {
  const towns: string[] = [];
  const legDistricts: RosterFilters["legDistricts"] = [];
  const seenPairs = new Set<string>();
  for (const { cityTown, legDistrict } of pairs) {
    if (!towns.includes(cityTown)) towns.push(cityTown);
    const key = `${cityTown}\u0000${String(legDistrict)}`;
    if (!seenPairs.has(key)) {
      seenPairs.add(key);
      legDistricts.push({ cityTown, legDistrict });
    }
  }
  return { towns, legDistricts };
}

/**
 * Slices one page out of the ordered scope. `cursor` is the committeeListId of
 * the last rollup on the previous page; null means "start from the beginning".
 * Returns null when the cursor is not in scope (stale or foreign).
 */
function paginateRollups(
  rollups: EdRollup[],
  cursor: number | undefined,
  limit: number,
): { page: EdRollup[]; nextCursor: number | null } | null {
  let start = 0;
  if (cursor !== undefined) {
    const index = rollups.findIndex((r) => r.committeeListId === cursor);
    if (index === -1) return null;
    start = index + 1;
  }
  const page = rollups.slice(start, start + limit);
  const last = page[page.length - 1];
  const nextCursor =
    last !== undefined && start + limit < rollups.length
      ? last.committeeListId
      : null;
  return { page, nextCursor };
}

async function getRoster(req: NextRequest, session: SessionWithUser) {
  const params = req.nextUrl.searchParams;
  const queryParams = {
    cityTown: params.get("cityTown") ?? undefined,
    legDistrict: params.get("legDistrict") ?? undefined,
    cursor: params.get("cursor") ?? undefined,
    limit: params.get("limit") ?? undefined,
    includeRows: params.get("includeRows") ?? undefined,
  };

  const parsed = rosterQuerySchema.safeParse(queryParams);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { cityTown, legDistrict, cursor, limit, includeRows } = parsed.data;

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

    // Base scope = active term ∩ caller's authority (Admin: county-wide;
    // Leader: their jurisdiction OR-filter). Empty jurisdictions -> { OR: [] }
    // -> matches nothing (correct empty result). Filter values come from here.
    const baseWhere: Prisma.CommitteeListWhereInput = {
      termId: activeTermId,
      ...(jurisdictions !== null ? buildJurisdictionWhere(jurisdictions) : {}),
    };

    // Requested scope = base scope AND the optional cityTown / legDistrict
    // narrowing. Out-of-scope requests AND to no rows (empty roster), so no
    // 403 is needed. Rollups and the summary come from here.
    const where: Prisma.CommitteeListWhereInput = {
      ...baseWhere,
      ...(cityTown !== undefined ? { cityTown } : {}),
      ...(legDistrict !== undefined ? { legDistrict } : {}),
    };

    // Whole requested scope, lean: no voter records. This is what makes the
    // summary scope-wide rather than page-wide; cost is O(committees in scope)
    // rows of ids/seat numbers, not O(rows rendered).
    const [scopeCommittees, filterPairs, config] = await Promise.all([
      prisma.committeeList.findMany({
        where,
        select: {
          id: true,
          cityTown: true,
          legDistrict: true,
          electionDistrict: true,
          seats: {
            select: { seatNumber: true, isPetitioned: true, weight: true },
            orderBy: { seatNumber: "asc" },
          },
          memberships: {
            where: { status: ACTIVE_MEMBERSHIP_STATUS, termId: activeTermId },
            select: {
              seatNumber: true,
              membershipType: true,
              voterRecordId: true,
            },
          },
          _count: {
            select: {
              memberships: {
                where: {
                  status: PENDING_MEMBERSHIP_STATUS,
                  termId: activeTermId,
                },
              },
            },
          },
        },
        orderBy: ROSTER_ORDER,
      }),
      prisma.committeeList.findMany({
        where: baseWhere,
        select: { cityTown: true, legDistrict: true },
        distinct: ["cityTown", "legDistrict"],
        orderBy: [{ cityTown: "asc" }, { legDistrict: "asc" }],
      }),
      getGovernanceConfig(),
    ]);

    const rollupOptions = {
      termId: activeTermId,
      maxSeatsPerLted: config.maxSeatsPerLted,
    };

    const scopeRollups = buildEdRollups(
      scopeCommittees.map(
        (c): RosterCommitteeCore => ({
          ...c,
          pendingCount: c._count.memberships,
        }),
      ),
      rollupOptions,
    );
    const summary = summarizeEdRollups(scopeRollups);

    const paged = paginateRollups(scopeRollups, cursor, limit);
    if (paged === null) {
      return NextResponse.json(
        { error: "cursor is not in scope; restart from the first page" },
        { status: 400 },
      );
    }
    const { page, nextCursor } = paged;

    const response: RosterResponse = {
      scope: {
        ...(cityTown !== undefined ? { cityTown } : {}),
        ...(legDistrict !== undefined ? { legDistrict } : {}),
      },
      filters: toFilters(filterPairs),
      edRollups: page,
      summary,
      nextCursor,
    };

    if (includeRows && page.length > 0) {
      // Seat rows only for the page: this is the only query that touches
      // voter records, and thus the only place contact can enter the response.
      const pendingByCommittee = new Map(
        page.map((r) => [r.committeeListId, r.pendingCount]),
      );
      const pageCommittees = await prisma.committeeList.findMany({
        where: { ...where, id: { in: page.map((r) => r.committeeListId) } },
        include: {
          seats: { orderBy: { seatNumber: "asc" } },
          memberships: {
            where: { status: ACTIVE_MEMBERSHIP_STATUS, termId: activeTermId },
            include: { voterRecord: true },
          },
        },
        orderBy: ROSTER_ORDER,
      });
      const { rows } = buildSeatRosterRows(
        pageCommittees.map(
          (c): RosterCommittee => ({
            ...c,
            pendingCount: pendingByCommittee.get(c.id) ?? 0,
          }),
        ),
        { ...rollupOptions, includeContact },
      );
      response.rows = rows;
    } else if (includeRows) {
      response.rows = [];
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const extra = {
      cityTown: cityTown ?? null,
      legDistrict: legDistrict ?? null,
    };
    if (
      error instanceof Error &&
      error.message.startsWith("Data integrity error")
    ) {
      Sentry.captureException(error, {
        tags: { route: "committee/roster" },
        extra,
      });
      console.error("[committee/roster]", error.message);
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    Sentry.captureException(error, {
      tags: { route: "committee/roster" },
      extra,
    });
    console.error("[committee/roster]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Leader, getRoster);
