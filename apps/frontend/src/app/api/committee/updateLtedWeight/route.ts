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

class CommitteeNotFoundError extends Error {
  constructor() {
    super("Committee not found");
    this.name = "CommitteeNotFoundError";
  }
}

async function updateLtedWeightHandler(req: NextRequest, _session: Session) {
  const body = (await req.json()) as unknown;
  const validation = validateRequest(body, updateLtedWeightSchema);

  if (!validation.success) {
    return validation.response;
  }

  const { committeeListId, ltedWeight } = validation.data;

  try {
    // Keep LTED update + seat recompute in one transaction so failures roll back together.
    await prisma.$transaction(async (tx) => {
      const committee = await tx.committeeList.findUnique({
        where: { id: committeeListId },
        select: { id: true },
      });

      if (!committee) {
        throw new CommitteeNotFoundError();
      }

      await tx.committeeList.update({
        where: { id: committeeListId },
        data: { ltedWeight },
      });
      await recomputeSeatWeights(committeeListId, { tx });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof CommitteeNotFoundError) {
      return NextResponse.json(
        { error: "Committee not found" },
        { status: 404 },
      );
    }

    console.error("Error updating LTED weight:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const PATCH = withPrivilege(PrivilegeLevel.Admin, updateLtedWeightHandler);
