import { NextResponse, type NextRequest } from "next/server";
import {
  type DiscrepancyResolution,
  PrivilegeLevel,
} from "@prisma/client";
import { handleCommitteeDiscrepancySchema } from "@voter-file-tool/shared-validators";
import prisma from "~/lib/prisma";
import { withPrivilege, type SessionWithUser } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import {
  ACTIVE_MEMBERSHIP_STATUS,
  ALREADY_IN_ANOTHER_COMMITTEE_ERROR,
  getGovernanceConfig,
  isActiveMembershipPerTermConflict,
  isCommitteeAtCapacity,
  isVoterActiveInAnotherCommittee,
} from "~/app/api/lib/committeeValidation";
import {
  assignNextAvailableSeat,
  ensureSeatsExist,
} from "~/app/api/lib/seatUtils";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import {
  buildMembershipAuditSubject,
  mergeAuditMetadata,
} from "~/lib/auditMembershipSubject";
import {
  buildDecisionMetadata,
  lockDiscrepancyForUpdate,
  snapshotMembershipAfter,
  snapshotMembershipBefore,
  type ResolutionMetadata,
} from "~/app/api/lib/committeeDiscrepancyResolution";

type ResolveTxResult =
  | { kind: "success"; committee: { id: number; cityTown: string; legDistrict: number; electionDistrict: number } }
  | { kind: "already_resolved" }
  | { kind: "reject_with_address" }
  | { kind: "atCapacity" }
  | { kind: "anotherCommittee" }
  | { kind: "not_found" };

async function handleCommitteeDiscrepancyHandler(
  req: NextRequest,
  session: SessionWithUser,
) {
  try {
    const body = (await req.json()) as unknown;
    const validation = validateRequest(body, handleCommitteeDiscrepancySchema);
    if (!validation.success) {
      return validation.response;
    }

    const { VRCNUM, accept, takeAddress } = validation.data;
    const takeAddressValue = takeAddress ?? "";

    const initialDiscrepancy = await prisma.committeeUploadDiscrepancy.findUnique({
      where: { VRCNUM },
      include: {
        committee: {
          include: { term: { select: { id: true, label: true } } },
        },
      },
    });

    if (!initialDiscrepancy) {
      return NextResponse.json(
        { error: "Discrepancy not found" },
        { status: 404 },
      );
    }

    if (accept) {
      const voterRecord = await prisma.voterRecord.findUnique({
        where: { VRCNUM },
        select: {
          VRCNUM: true,
          firstName: true,
          middleInitial: true,
          lastName: true,
        },
      });

      if (!voterRecord) {
        return NextResponse.json({ error: "Voter not found" }, { status: 404 });
      }
    }

    const actorUserId = session.user.id;
    const actorRole = session.user.privilegeLevel ?? PrivilegeLevel.Admin;
    const config = accept ? await getGovernanceConfig() : null;

    const result: ResolveTxResult = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "CommitteeList"
        WHERE id = ${initialDiscrepancy.committee.id}
        FOR UPDATE
      `;

      const discrepancy = await lockDiscrepancyForUpdate(tx, VRCNUM);
      if (!discrepancy) {
        return { kind: "not_found" as const };
      }

      if (discrepancy.resolvedAt != null) {
        return { kind: "already_resolved" as const };
      }

      if (!accept && takeAddressValue !== "") {
        return { kind: "reject_with_address" as const };
      }

      const resolutionMetadata: ResolutionMetadata = {
        membershipOutcome: "none",
      };
      let resolution: DiscrepancyResolution;

      if (accept) {
        const voterRecord = await tx.voterRecord.findUnique({
          where: { VRCNUM },
          select: {
            VRCNUM: true,
            firstName: true,
            middleInitial: true,
            lastName: true,
          },
        });

        if (!voterRecord) {
          throw new Error("Voter not found during accept transaction");
        }

        const committeeTerm = discrepancy.committee.term;

        const existingMembership = await tx.committeeMembership.findUnique({
          where: {
            voterRecordId_committeeListId_termId: {
              voterRecordId: VRCNUM,
              committeeListId: discrepancy.committee.id,
              termId: discrepancy.committee.termId,
            },
          },
        });

        if (existingMembership?.status === ACTIVE_MEMBERSHIP_STATUS) {
          resolutionMetadata.membershipOutcome = "none";
        } else {
          if (
            await isVoterActiveInAnotherCommittee(
              VRCNUM,
              discrepancy.committee.id,
              discrepancy.committee.termId,
              tx,
            )
          ) {
            return { kind: "anotherCommittee" as const };
          }

          if (
            await isCommitteeAtCapacity(
              discrepancy.committee.id,
              discrepancy.committee.termId,
              config!.maxSeatsPerLted,
              tx,
            )
          ) {
            return { kind: "atCapacity" as const };
          }

          await ensureSeatsExist(discrepancy.committee.id, discrepancy.committee.termId, {
            tx,
            maxSeats: config!.maxSeatsPerLted,
          });

          const seatNumber = await assignNextAvailableSeat(
            discrepancy.committee.id,
            discrepancy.committee.termId,
            {
              tx,
              maxSeats: config!.maxSeatsPerLted,
            },
          );

          if (existingMembership) {
            resolutionMetadata.membershipBefore = snapshotMembershipBefore(
              existingMembership,
            );
            resolutionMetadata.membershipOutcome = "reactivated";

            const updatedMembership = await tx.committeeMembership.update({
              where: { id: existingMembership.id },
              data: {
                status: ACTIVE_MEMBERSHIP_STATUS,
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

            resolutionMetadata.membershipId = updatedMembership.id;
            resolutionMetadata.membershipAfter =
              snapshotMembershipAfter(updatedMembership);

            await logAuditEventOrThrow(
              actorUserId,
              actorRole,
              "MEMBER_ACTIVATED",
              "CommitteeMembership",
              updatedMembership.id,
              { status: existingMembership.status },
              { status: ACTIVE_MEMBERSHIP_STATUS, seatNumber },
              mergeAuditMetadata(
                {
                  source: "discrepancy_accept",
                  discrepancyVrcnum: VRCNUM,
                },
                buildMembershipAuditSubject({
                  voterRecord,
                  committee: discrepancy.committee,
                  term: committeeTerm,
                  seatNumber,
                }),
              ),
              tx,
            );
          } else {
            resolutionMetadata.membershipOutcome = "created";

            const createdMembership = await tx.committeeMembership.create({
              data: {
                voterRecordId: VRCNUM,
                committeeListId: discrepancy.committee.id,
                termId: discrepancy.committee.termId,
                status: ACTIVE_MEMBERSHIP_STATUS,
                activatedAt: new Date(),
                membershipType: "APPOINTED",
                seatNumber,
              },
            });

            resolutionMetadata.membershipId = createdMembership.id;
            resolutionMetadata.membershipAfter =
              snapshotMembershipAfter(createdMembership);

            await logAuditEventOrThrow(
              actorUserId,
              actorRole,
              "MEMBER_ACTIVATED",
              "CommitteeMembership",
              createdMembership.id,
              null,
              { status: ACTIVE_MEMBERSHIP_STATUS, seatNumber },
              mergeAuditMetadata(
                {
                  source: "discrepancy_accept",
                  discrepancyVrcnum: VRCNUM,
                },
                buildMembershipAuditSubject({
                  voterRecord,
                  committee: discrepancy.committee,
                  term: committeeTerm,
                  seatNumber,
                }),
              ),
              tx,
            );
          }
        }

        if (takeAddressValue !== "") {
          await tx.$queryRaw`
            SELECT "VRCNUM"
            FROM "VoterRecord"
            WHERE "VRCNUM" = ${VRCNUM}
            FOR UPDATE
          `;

          const voterBefore = await tx.voterRecord.findUnique({
            where: { VRCNUM },
            select: { addressForCommittee: true },
          });

          resolutionMetadata.addressBefore =
            voterBefore?.addressForCommittee ?? null;
          resolutionMetadata.addressAfter = takeAddressValue;

          await tx.voterRecord.update({
            where: { VRCNUM },
            data: { addressForCommittee: takeAddressValue },
          });

          resolution = "ACCEPTED_WITH_ADDRESS";
        } else {
          resolution = "ACCEPTED";
        }
      } else {
        resolution = "REJECTED";
      }

      const decisionMetadata = buildDecisionMetadata({
        VRCNUM,
        committeeId: discrepancy.committeeId,
        termId: discrepancy.committee.termId,
        discrepancy: discrepancy.discrepancy,
        resolution,
        resolutionMetadata,
      });

      const resolvedAt = new Date();

      const resolvedSnapshot = {
        resolvedAt: resolvedAt.toISOString(),
        resolvedBy: actorUserId,
        resolution,
        resolutionMetadata,
      };

      await logAuditEventOrThrow(
        actorUserId,
        actorRole,
        accept ? "DISCREPANCY_ACCEPTED" : "DISCREPANCY_REJECTED",
        "CommitteeUploadDiscrepancy",
        discrepancy.id,
        null,
        resolvedSnapshot,
        decisionMetadata,
        tx,
      );

      await tx.committeeUploadDiscrepancy.update({
        where: { id: discrepancy.id },
        data: {
          resolvedAt,
          resolvedBy: actorUserId,
          resolution,
          resolutionMetadata,
        },
      });

      return {
        kind: "success" as const,
        committee: {
          id: discrepancy.committee.id,
          cityTown: discrepancy.committee.cityTown,
          legDistrict: discrepancy.committee.legDistrict,
          electionDistrict: discrepancy.committee.electionDistrict,
        },
      };
    });

    if (result.kind === "not_found") {
      return NextResponse.json(
        { error: "Discrepancy not found" },
        { status: 404 },
      );
    }

    if (result.kind === "already_resolved") {
      return NextResponse.json(
        { error: "Discrepancy already resolved", reason: "already_resolved" },
        { status: 409 },
      );
    }

    if (result.kind === "reject_with_address") {
      return NextResponse.json(
        { error: "Cannot update address when rejecting a discrepancy" },
        { status: 400 },
      );
    }

    if (result.kind === "atCapacity") {
      return NextResponse.json(
        { error: "Committee is at capacity" },
        { status: 400 },
      );
    }

    if (result.kind === "anotherCommittee") {
      return NextResponse.json(
        { error: ALREADY_IN_ANOTHER_COMMITTEE_ERROR },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Discrepancy handled successfully",
        committee: result.committee,
      },
      { status: 200 },
    );
  } catch (error) {
    if (isActiveMembershipPerTermConflict(error)) {
      return NextResponse.json(
        { error: ALREADY_IN_ANOTHER_COMMITTEE_ERROR },
        { status: 400 },
      );
    }
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
