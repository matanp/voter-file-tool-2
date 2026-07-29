/**
 * SRS §2.2 — Read-only preflight endpoint for eligibility (including warnings).
 * GET /api/committee/eligibility?voterRecordId=...&committeeListId=...
 * Returns { eligible, hardStops, warnings }. Use for UX prefetch only; mutation endpoints remain authoritative.
 */

import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import { runEligibilityPreflight } from "~/lib/eligibilityPreflight";
import prisma from "~/lib/prisma";
import type { Session } from "next-auth";

async function eligibilityHandler(req: NextRequest, _session: Session) {
  const { searchParams } = new URL(req.url ?? "", "http://localhost");
  const voterRecordId = searchParams.get("voterRecordId")?.trim();
  const committeeListIdRaw = searchParams.get("committeeListId");

  if (!voterRecordId) {
    return NextResponse.json(
      { error: "voterRecordId is required" },
      { status: 400 },
    );
  }
  const committeeListId = Number(committeeListIdRaw);
  if (
    committeeListIdRaw === null ||
    committeeListIdRaw === "" ||
    !Number.isInteger(committeeListId) ||
    committeeListId < 1
  ) {
    return NextResponse.json(
      { error: "committeeListId must be a positive integer" },
      { status: 400 },
    );
  }

  try {
    const activeTermId = await getActiveTermId();
    const committeeList = await prisma.committeeList.findUnique({
      where: { id: committeeListId },
      select: {
        cityTown: true,
        legDistrict: true,
        electionDistrict: true,
      },
    });
    if (!committeeList) {
      return NextResponse.json(
        { error: "Committee not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      await runEligibilityPreflight(
        voterRecordId,
        committeeListId,
        activeTermId,
        committeeList,
      ),
    );
  } catch (error) {
    console.error("Eligibility preflight error:", error);
    return NextResponse.json(
      { error: "Failed to check eligibility" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(
  PrivilegeLevel.RequestAccess,
  eligibilityHandler,
);
