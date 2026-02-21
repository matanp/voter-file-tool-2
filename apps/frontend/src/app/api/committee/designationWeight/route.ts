/**
 * SRS 2.7 — GET /api/committee/designationWeight
 *
 * Returns per-seat weight contribution breakdown and total designation weight
 * for a committee in a given term.
 */

import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import prisma from "~/lib/prisma";
import { withPrivilege, type SessionWithUser } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { designationWeightQuerySchema } from "~/lib/validations/committee";
import { calculateDesignationWeight } from "~/lib/designationWeight";
import {
  getUserJurisdictions,
  committeeMatchesJurisdictions,
} from "~/app/api/lib/committeeValidation";

async function getDesignationWeight(req: NextRequest, session: SessionWithUser) {
  const queryParams = {
    committeeListId: req.nextUrl.searchParams.get("committeeListId"),
    termId: req.nextUrl.searchParams.get("termId") || undefined,
  };

  const validation = validateRequest(queryParams, designationWeightQuerySchema);
  if (!validation.success) {
    return validation.response;
  }

  const { committeeListId, termId } = validation.data;

  try {
    const isAdmin =
      session.user.privilegeLevel === PrivilegeLevel.Admin ||
      session.user.privilegeLevel === PrivilegeLevel.Developer;

    // SRS 3.1 — Leader access is limited to assigned UserJurisdiction scope.
    if (!isAdmin) {
      const committee = await prisma.committeeList.findUnique({
        where: { id: committeeListId },
        select: {
          id: true,
          cityTown: true,
          legDistrict: true,
          termId: true,
        },
      });

      if (!committee) {
        return NextResponse.json(
          { success: false, error: "Committee not found" },
          { status: 404 },
        );
      }

      const effectiveTermId = termId ?? committee.termId;
      const privilegeLevel =
        session.user.privilegeLevel ?? PrivilegeLevel.ReadAccess;
      const jurisdictions = await getUserJurisdictions(
        session.user.id,
        effectiveTermId,
        privilegeLevel,
      );
      if (
        jurisdictions !== null &&
        !committeeMatchesJurisdictions(
          committee.cityTown,
          committee.legDistrict,
          jurisdictions,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "User does not have jurisdiction access for this committee",
          },
          { status: 403 },
        );
      }
    }

    const result = await calculateDesignationWeight(committeeListId, termId);
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Data integrity error")
    ) {
      Sentry.captureException(error, {
        tags: { route: "committee/designationWeight" },
        extra: { committeeListId, termId: termId ?? null },
      });
      console.error("[designationWeight]", error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 },
      );
    }
    Sentry.captureException(error, {
      tags: { route: "committee/designationWeight" },
      extra: { committeeListId, termId: termId ?? null },
    });
    console.error("[designationWeight]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Leader, getDesignationWeight);
