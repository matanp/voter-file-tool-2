/**
 * PATCH /api/committee/updateLtedWeight
 * SRS 1.4 — Update CommitteeList.ltedWeight and recompute seat weights.
 */

import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { updateLtedWeightSchema } from "~/lib/validations/committee";
import { recomputeSeatWeights } from "~/app/api/lib/seatUtils";
import type { Session } from "next-auth";

async function updateLtedWeightHandler(req: NextRequest, _session: Session) {
  const body = (await req.json()) as unknown;
  const validation = validateRequest(body, updateLtedWeightSchema);

  if (!validation.success) {
    return validation.response;
  }

  const { committeeListId, ltedWeight } = validation.data;

  try {
    const committee = await prisma.committeeList.findUnique({
      where: { id: committeeListId },
    });

    if (!committee) {
      return NextResponse.json(
        { error: "Committee not found" },
        { status: 404 },
      );
    }

    await prisma.committeeList.update({
      where: { id: committeeListId },
      data: { ltedWeight },
    });
    await recomputeSeatWeights(committeeListId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating LTED weight:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const PATCH = withPrivilege(PrivilegeLevel.Admin, updateLtedWeightHandler);
