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

    // SRS 2.7 — Leader access is limited to jurisdictions where they have
    // submitted committee activity in the target term.
    if (!isAdmin) {
      const committee = await prisma.committeeList.findUnique({
        where: { id: committeeListId },
        select: {
          id: true,
          cityTown: true,
          legDistrict: true,
          electionDistrict: true,
          termId: true,
        },
      });

      if (!committee) {
        return NextResponse.json(
          { success: false, error: "Committee not found" },
          { status: 404 },
        );
      }

      const permitted = await prisma.committeeMembership.findFirst({
        where: {
          submittedById: session.user.id,
          termId: committee.termId,
          committeeList: {
            cityTown: committee.cityTown,
            legDistrict: committee.legDistrict,
            electionDistrict: committee.electionDistrict,
          },
        },
        select: { id: true },
      });

      if (!permitted) {
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
