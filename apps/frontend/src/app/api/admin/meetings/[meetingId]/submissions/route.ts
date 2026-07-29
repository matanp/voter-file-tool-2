/**
 * SRS 2.4 — GET /api/admin/meetings/[meetingId]/submissions
 * Returns SUBMITTED memberships for the active term, candidates for bulk decisions.
 */

import { PrivilegeLevel } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";

type RouteContext = { params?: Promise<{ meetingId: string }> };

async function getSubmissionsHandler(
  _req: NextRequest,
  _session: SessionWithUser,
  ...contextArgs: unknown[]
) {
  const context = contextArgs[0] as RouteContext | undefined;
  const params = context?.params;
  if (!params) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { meetingId } = await params;

  try {
    const meeting = await prisma.meetingRecord.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found" },
        { status: 404 },
      );
    }

    const activeTermId = await getActiveTermId();

    const submissions = await prisma.committeeMembership.findMany({
      where: {
        status: "SUBMITTED",
        termId: activeTermId,
      },
      include: {
        voterRecord: {
          select: {
            VRCNUM: true,
            firstName: true,
            lastName: true,
            middleInitial: true,
            suffixName: true,
          },
        },
        committeeList: {
          select: {
            id: true,
            cityTown: true,
            legDistrict: true,
            electionDistrict: true,
          },
        },
      },
      orderBy: { submittedAt: "asc" },
    });

    return NextResponse.json({
      submissions: submissions.map((s) => ({
        id: s.id,
        voterRecordId: s.voterRecordId,
        voterRecord: s.voterRecord,
        committeeListId: s.committeeListId,
        committeeList: s.committeeList,
        membershipType: s.membershipType,
        submittedAt: s.submittedAt.toISOString(),
        submissionMetadata: s.submissionMetadata,
      })),
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(
  PrivilegeLevel.Admin,
  getSubmissionsHandler,
);
