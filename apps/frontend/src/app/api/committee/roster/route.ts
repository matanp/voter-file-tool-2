/**
 * Committee Roster View — GET /api/committee/roster
 *
 * Town-level seat roster: every seat (occupied and vacant) across all Election
 * Districts in a scope, flattened to rows. Read-only; never mutates seats.
 * See docs/COMMITTEE_ROSTER_VIEW.md.
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
  getActiveTermId,
  getGovernanceConfig,
  getUserJurisdictions,
  buildJurisdictionWhere,
} from "~/app/api/lib/committeeValidation";
import {
  buildSeatRosterRows,
  type RosterCommittee,
} from "./buildSeatRosterRows";
import {
  rosterQuerySchema,
  type RosterResponse,
} from "~/lib/validations/committee";

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
