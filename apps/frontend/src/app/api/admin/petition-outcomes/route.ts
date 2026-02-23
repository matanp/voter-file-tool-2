/**
 * SRS 2.6 — List petition outcomes (Admin-only). Filter by term, committee, status.
 */

import prisma from "~/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { getPetitionOutcomesQuerySchema } from "~/lib/validations/committee";
import type { Session } from "next-auth";

async function getPetitionOutcomesHandler(req: NextRequest, _session: Session) {
  const { searchParams } = new URL(req.url);
  const query = Object.fromEntries(searchParams.entries());
  const validation = validateRequest(query, getPetitionOutcomesQuerySchema);

  if (!validation.success) {
    return validation.response;
  }

  const { termId, committeeListId, status } = validation.data;

  try {
    const memberships = await prisma.committeeMembership.findMany({
      where: {
        membershipType: "PETITIONED",
        petitionSeatNumber: { not: null },
        ...(termId ? { termId } : {}),
        ...(committeeListId ? { committeeListId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        voterRecord: {
          select: {
            VRCNUM: true,
            firstName: true,
            lastName: true,
          },
        },
        committeeList: {
          select: {
            id: true,
            cityTown: true,
            legDistrict: true,
            electionDistrict: true,
            termId: true,
          },
        },
        term: {
          select: { id: true, label: true },
        },
      },
      orderBy: [
        { committeeListId: "asc" },
        { termId: "asc" },
        { petitionSeatNumber: "asc" },
        { petitionPrimaryDate: "desc" },
      ],
    });

    const payload = memberships.map((m) => ({
      id: m.id,
      voterRecordId: m.voterRecordId,
      voter: m.voterRecord
        ? {
            VRCNUM: m.voterRecord.VRCNUM,
            firstName: m.voterRecord.firstName,
            lastName: m.voterRecord.lastName,
          }
        : null,
      committeeListId: m.committeeListId,
      committee: m.committeeList,
      termId: m.termId,
      term: m.term,
      seatNumber: m.seatNumber,
      petitionSeatNumber: m.petitionSeatNumber,
      status: m.status,
      petitionPrimaryDate: m.petitionPrimaryDate,
      petitionVoteCount: m.petitionVoteCount,
    }));

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Get petition outcomes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const GET = withPrivilege(PrivilegeLevel.Admin, getPetitionOutcomesHandler);
