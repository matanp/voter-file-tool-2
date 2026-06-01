/**
 * SRS 3.1 — GET current user's jurisdictions for the active term.
 * Used by CommitteeSelector for Leader filtering and empty states.
 */

import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import { withPrivilege, type SessionWithUser } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";

async function getHandler(_req: NextRequest, session: SessionWithUser) {
  try {
    const activeTermId = await getActiveTermId();
    const jurisdictions = await prisma.userJurisdiction.findMany({
      where: { userId: session.user.id, termId: activeTermId },
      include: { term: { select: { label: true } } },
    });
    return NextResponse.json(jurisdictions, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("No active CommitteeTerm") ||
        error.message.includes("CommitteeGovernanceConfig not found"))
    ) {
      return NextResponse.json([], { status: 200 });
    }
    console.error("Error fetching user jurisdictions:", error);
    return NextResponse.json(
      { error: "Failed to fetch jurisdictions" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Leader, getHandler);
