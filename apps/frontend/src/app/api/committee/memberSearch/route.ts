/**
 * Committee member name search — GET /api/committee/memberSearch?q=
 *
 * Finds committee members by first and/or last name across every committee
 * the caller can see in the active term, for the committees workspace
 * (leader feedback 2026-11-11, ticket 07).
 *
 * - Leader and up (`withPrivilege`), the same as the roster APIs.
 * - Scope comes from the real session role: Admin and Developer see every
 *   committee; a Leader sees only committees in their jurisdictions (a null
 *   LD covers the whole town), and a Leader with none gets no hits.
 * - ACTIVE members, plus SUBMITTED and CONFIRMED as "pending". Exited,
 *   rejected and petition-outcome rows never appear.
 * - Case-insensitive; every word of `q` must match the first or last name.
 *   At most `MEMBER_SEARCH_LIMIT` hits, with `truncated` when there were more.
 */

import { type NextRequest, NextResponse } from "next/server";
import { MembershipStatus, PrivilegeLevel, type Prisma } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import prisma from "~/lib/prisma";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";
import {
  buildJurisdictionWhere,
  getActiveTermId,
  getUserJurisdictions,
} from "~/app/api/lib/committeeValidation";
import {
  MEMBER_SEARCH_LIMIT,
  memberSearchQuerySchema,
  type MemberSearchHit,
  type MemberSearchResponse,
} from "~/lib/validations/committee";

/**
 * ACTIVE, plus the two not-yet-active states the search labels "pending"
 * (ticket 05 decision 3). Broader than `PENDING_MEMBERSHIP_STATUS`
 * (SUBMITTED only, the requests queue): a CONFIRMED member is not seated yet
 * either, and a Leader looking for a name should still find them.
 */
const SEARCHABLE_STATUSES = [
  MembershipStatus.ACTIVE,
  MembershipStatus.SUBMITTED,
  MembershipStatus.CONFIRMED,
];

function nameWhere(terms: string[]): Prisma.VoterRecordWhereInput {
  return {
    AND: terms.map((term) => ({
      OR: [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
      ],
    })),
  };
}

async function searchMembers(req: NextRequest, session: SessionWithUser) {
  const parsed = memberSearchQuerySchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const terms = parsed.data.q;

  try {
    const activeTermId = await getActiveTermId();
    const jurisdictions = await getUserJurisdictions(
      session.user.id,
      activeTermId,
      session.user.privilegeLevel ?? PrivilegeLevel.ReadAccess,
    );
    if (jurisdictions !== null && jurisdictions.length === 0) {
      const empty: MemberSearchResponse = { hits: [], truncated: false };
      return NextResponse.json(empty, { status: 200 });
    }

    const memberships = await prisma.committeeMembership.findMany({
      where: {
        termId: activeTermId,
        status: { in: SEARCHABLE_STATUSES },
        committeeList: {
          termId: activeTermId,
          ...(jurisdictions !== null
            ? buildJurisdictionWhere(jurisdictions)
            : {}),
        },
        voterRecord: nameWhere(terms),
      },
      select: {
        id: true,
        status: true,
        voterRecord: { select: { firstName: true, lastName: true } },
        committeeList: {
          select: {
            id: true,
            cityTown: true,
            legDistrict: true,
            electionDistrict: true,
          },
        },
      },
      orderBy: [
        { voterRecord: { lastName: "asc" } },
        { voterRecord: { firstName: "asc" } },
        { id: "asc" },
      ],
      take: MEMBER_SEARCH_LIMIT + 1,
    });

    const hits = memberships.slice(0, MEMBER_SEARCH_LIMIT).map(
      (m): MemberSearchHit => ({
        membershipId: m.id,
        committeeListId: m.committeeList.id,
        firstName: m.voterRecord.firstName,
        lastName: m.voterRecord.lastName,
        status: m.status === MembershipStatus.ACTIVE ? "active" : "pending",
        cityTown: m.committeeList.cityTown,
        legDistrict: m.committeeList.legDistrict,
        electionDistrict: m.committeeList.electionDistrict,
      }),
    );
    const response: MemberSearchResponse = {
      hits,
      truncated: memberships.length > MEMBER_SEARCH_LIMIT,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "committee/memberSearch" },
    });
    console.error("[committee/memberSearch]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Leader, searchMembers);
