import { NextResponse, type NextRequest } from "next/server";
import prisma from "~/lib/prisma";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { PrivilegeLevel } from "@prisma/client";
import type { Session } from "next-auth";
import {
  ALREADY_IN_ANOTHER_COMMITTEE_ERROR,
  getGovernanceConfig,
} from "~/app/api/lib/committeeValidation";
import {
  assignNextAvailableSeat,
  ensureSeatsExist,
} from "~/app/api/lib/seatUtils";

export interface HandleDiscrepancyRequest {
  VRCNUM: string;
  committeeId: number;
  accept: boolean;
  takeAddress: string;
}

async function handleCommitteeDiscrepancyHandler(
  req: NextRequest,
  _session: Session,
) {
  try {
    const { VRCNUM, accept, takeAddress } =
      (await req.json()) as HandleDiscrepancyRequest;

    if (!VRCNUM) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const discrepancy = await prisma.committeeUploadDiscrepancy.findUnique({
      where: {
        VRCNUM,
      },
      include: {
        committee: true,
      },
    });

    if (!discrepancy) {
      return NextResponse.json(
        { error: "Discrepancy not found" },
        { status: 404 },
      );
    }

    if (accept) {
      const config = await getGovernanceConfig();

      const outcome = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT id
          FROM "CommitteeList"
          WHERE id = ${discrepancy.committee.id}
          FOR UPDATE
        `;

        await ensureSeatsExist(discrepancy.committee.id, discrepancy.committee.termId, {
          tx,
          maxSeats: config.maxSeatsPerLted,
        });

        const existingMembership = await tx.committeeMembership.findUnique({
          where: {
            voterRecordId_committeeListId_termId: {
              voterRecordId: VRCNUM,
              committeeListId: discrepancy.committee.id,
              termId: discrepancy.committee.termId,
            },
          },
        });

        if (existingMembership?.status === "ACTIVE") {
          return { kind: "alreadyActive" } as const;
        }

        const activeInAnotherCommittee = await tx.committeeMembership.findFirst({
          where: {
            voterRecordId: VRCNUM,
            committeeListId: { not: discrepancy.committee.id },
            termId: discrepancy.committee.termId,
            status: "ACTIVE",
          },
          select: { id: true },
        });

        if (activeInAnotherCommittee) {
          return { kind: "anotherCommittee" } as const;
        }

        const activeCount = await tx.committeeMembership.count({
          where: {
            committeeListId: discrepancy.committee.id,
            termId: discrepancy.committee.termId,
            status: "ACTIVE",
          },
        });

        if (activeCount >= config.maxSeatsPerLted) {
          return { kind: "atCapacity" } as const;
        }

        const seatNumber = await assignNextAvailableSeat(
          discrepancy.committee.id,
          discrepancy.committee.termId,
          {
            tx,
            maxSeats: config.maxSeatsPerLted,
          },
        );

        if (existingMembership) {
          await tx.committeeMembership.update({
            where: { id: existingMembership.id },
            data: {
              status: "ACTIVE",
              activatedAt: new Date(),
              membershipType: existingMembership.membershipType ?? "APPOINTED",
              seatNumber,
              confirmedAt: null,
              resignedAt: null,
              removedAt: null,
              rejectedAt: null,
              rejectionNote: null,
              resignationDateReceived: null,
              resignationMethod: null,
              removalReason: null,
              removalNotes: null,
              petitionVoteCount: null,
              petitionPrimaryDate: null,
            },
          });
        } else {
          await tx.committeeMembership.create({
            data: {
              voterRecordId: VRCNUM,
              committeeListId: discrepancy.committee.id,
              termId: discrepancy.committee.termId,
              status: "ACTIVE",
              activatedAt: new Date(),
              membershipType: "APPOINTED",
              seatNumber,
            },
          });
        }

        return { kind: "accepted" } as const;
      });

      if (outcome.kind === "atCapacity") {
        return NextResponse.json(
          { error: "Committee is at capacity" },
          { status: 400 },
        );
      }

      if (outcome.kind === "anotherCommittee") {
        return NextResponse.json(
          { error: ALREADY_IN_ANOTHER_COMMITTEE_ERROR },
          { status: 400 },
        );
      }
    }

    if (takeAddress) {
      await prisma.voterRecord.update({
        where: {
          VRCNUM,
        },
        data: {
          addressForCommittee: takeAddress,
        },
      });
    }

    await prisma.committeeUploadDiscrepancy.delete({
      where: {
        VRCNUM,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Discrepancy handled successfully",
        committee: discrepancy.committee,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.Admin,
  handleCommitteeDiscrepancyHandler,
);
