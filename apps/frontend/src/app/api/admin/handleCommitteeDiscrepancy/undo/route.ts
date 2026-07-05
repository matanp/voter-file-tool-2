import { NextResponse, type NextRequest } from "next/server";
import { PrivilegeLevel, Prisma } from "@prisma/client";
import { undoCommitteeDiscrepancySchema } from "@voter-file-tool/shared-validators";
import prisma from "~/lib/prisma";
import { withPrivilege, type SessionWithUser } from "~/app/api/lib/withPrivilege";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import {
  buildMembershipAuditSubject,
  mergeAuditMetadata,
} from "~/lib/auditMembershipSubject";
import {
  buildDecisionMetadata,
  compensatingAuditActionForStatus,
  membershipBeforeToUpdateData,
  membershipMatchesAfter,
  parseResolutionMetadata,
  snapshotMembershipAfter,
  type DiscrepancyDecisionMetadata,
} from "~/app/api/lib/committeeDiscrepancyResolution";

type UndoTxResult =
  | { kind: "success"; addressRestoreSkipped: boolean }
  | { kind: "not_found" }
  | { kind: "not_resolved" }
  | { kind: "membership_diverged" };

/** Locks and re-reads a discrepancy row inside a transaction. */
async function lockDiscrepancyForUpdate(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  vrcnum: string,
) {
  await tx.$queryRaw`
    SELECT id
    FROM "CommitteeUploadDiscrepancy"
    WHERE "VRCNUM" = ${vrcnum}
    FOR UPDATE
  `;

  return tx.committeeUploadDiscrepancy.findUnique({
    where: { VRCNUM: vrcnum },
    include: {
      committee: {
        include: { term: { select: { id: true, label: true } } },
      },
    },
  });
}

async function undoCommitteeDiscrepancyHandler(
  req: NextRequest,
  session: SessionWithUser,
) {
  try {
    const body = (await req.json()) as unknown;
    const validation = validateRequest(body, undoCommitteeDiscrepancySchema);
    if (!validation.success) {
      return validation.response;
    }

    const { VRCNUM } = validation.data;
    const actorUserId = session.user.id;
    const actorRole = session.user.privilegeLevel ?? PrivilegeLevel.Admin;

    const result: UndoTxResult = await prisma.$transaction(async (tx) => {
      const initialDiscrepancy = await tx.committeeUploadDiscrepancy.findUnique({
        where: { VRCNUM },
        select: { committeeId: true },
      });

      if (!initialDiscrepancy) {
        return { kind: "not_found" as const };
      }

      await tx.$queryRaw`
        SELECT id
        FROM "CommitteeList"
        WHERE id = ${initialDiscrepancy.committeeId}
        FOR UPDATE
      `;

      const discrepancy = await lockDiscrepancyForUpdate(tx, VRCNUM);
      if (!discrepancy) {
        return { kind: "not_found" as const };
      }

      if (discrepancy.resolvedAt == null || discrepancy.resolution == null) {
        return { kind: "not_resolved" as const };
      }

      const resolutionMetadata = parseResolutionMetadata(
        discrepancy.resolutionMetadata,
      );
      if (resolutionMetadata == null) {
        return { kind: "not_resolved" as const };
      }

      let addressRestoreSkipped = false;

      if (
        resolutionMetadata.membershipId != null &&
        resolutionMetadata.membershipAfter != null
      ) {
        await tx.$queryRaw`
          SELECT id
          FROM "CommitteeMembership"
          WHERE id = ${resolutionMetadata.membershipId}
          FOR UPDATE
        `;

        const currentMembership = await tx.committeeMembership.findUnique({
          where: { id: resolutionMetadata.membershipId },
        });

        if (
          !membershipMatchesAfter(
            currentMembership,
            resolutionMetadata.membershipAfter,
          )
        ) {
          return { kind: "membership_diverged" as const };
        }

        const voterRecord = await tx.voterRecord.findUnique({
          where: { VRCNUM },
          select: {
            VRCNUM: true,
            firstName: true,
            middleInitial: true,
            lastName: true,
          },
        });

        if (resolutionMetadata.membershipOutcome === "created") {
          const beforeSnapshot = snapshotMembershipAfter(currentMembership!);

          const updatedMembership = await tx.committeeMembership.update({
            where: { id: resolutionMetadata.membershipId },
            data: {
              status: "REMOVED",
              removedAt: new Date(),
              removalReason: "OTHER",
              removalNotes: "Undo of discrepancy accept",
              seatNumber: null,
            },
          });

          if (voterRecord) {
            await logAuditEventOrThrow(
              actorUserId,
              actorRole,
              "MEMBER_REMOVED",
              "CommitteeMembership",
              updatedMembership.id,
              beforeSnapshot,
              snapshotMembershipAfter(updatedMembership),
              mergeAuditMetadata(
                { source: "discrepancy_undo" },
                buildMembershipAuditSubject({
                  voterRecord,
                  committee: discrepancy.committee,
                  term: discrepancy.committee.term,
                  seatNumber: null,
                }),
              ),
              tx,
            );
          }
        } else if (
          resolutionMetadata.membershipOutcome === "reactivated" &&
          resolutionMetadata.membershipBefore != null
        ) {
          const beforeSnapshot = snapshotMembershipAfter(currentMembership!);
          const restoredStatus = resolutionMetadata.membershipBefore.status;
          const compensatingAction =
            compensatingAuditActionForStatus(restoredStatus);

          const updatedMembership = await tx.committeeMembership.update({
            where: { id: resolutionMetadata.membershipId },
            data: membershipBeforeToUpdateData(
              resolutionMetadata.membershipBefore,
            ),
          });

          if (voterRecord && compensatingAction != null) {
            await logAuditEventOrThrow(
              actorUserId,
              actorRole,
              compensatingAction,
              "CommitteeMembership",
              updatedMembership.id,
              beforeSnapshot,
              snapshotMembershipAfter(updatedMembership),
              mergeAuditMetadata(
                { source: "discrepancy_undo" },
                buildMembershipAuditSubject({
                  voterRecord,
                  committee: discrepancy.committee,
                  term: discrepancy.committee.term,
                  seatNumber: updatedMembership.seatNumber,
                }),
              ),
              tx,
            );
          }
        }
      }

      if (
        resolutionMetadata.addressBefore !== undefined &&
        resolutionMetadata.addressAfter != null
      ) {
        await tx.$queryRaw`
          SELECT "VRCNUM"
          FROM "VoterRecord"
          WHERE "VRCNUM" = ${VRCNUM}
          FOR UPDATE
        `;

        const voter = await tx.voterRecord.findUnique({
          where: { VRCNUM },
          select: { addressForCommittee: true },
        });

        if (voter?.addressForCommittee === resolutionMetadata.addressAfter) {
          await tx.voterRecord.update({
            where: { VRCNUM },
            data: { addressForCommittee: resolutionMetadata.addressBefore },
          });
        } else {
          addressRestoreSkipped = true;
        }
      }

      const priorDecisionMetadata = buildDecisionMetadata({
        VRCNUM,
        committeeId: discrepancy.committeeId,
        termId: discrepancy.committee.termId,
        discrepancy: discrepancy.discrepancy,
        resolution: discrepancy.resolution,
        resolutionMetadata,
      });

      const undoMetadata: DiscrepancyDecisionMetadata = {
        ...priorDecisionMetadata,
        addressRestoreSkipped,
      };

      const resolvedSnapshot = {
        resolvedAt: discrepancy.resolvedAt.toISOString(),
        resolvedBy: discrepancy.resolvedBy,
        resolution: discrepancy.resolution,
        resolutionMetadata,
      };

      await logAuditEventOrThrow(
        actorUserId,
        actorRole,
        "DISCREPANCY_UNDONE",
        "CommitteeUploadDiscrepancy",
        discrepancy.id,
        resolvedSnapshot,
        null,
        {
          ...undoMetadata,
          undoneAt: new Date().toISOString(),
          undoneBy: actorUserId,
        },
        tx,
      );

      await tx.committeeUploadDiscrepancy.update({
        where: { id: discrepancy.id },
        data: {
          resolvedAt: null,
          resolvedBy: null,
          resolution: null,
          resolutionMetadata: Prisma.JsonNull,
        },
      });

      return { kind: "success" as const, addressRestoreSkipped };
    });

    if (result.kind === "not_found") {
      return NextResponse.json(
        { error: "Discrepancy not found" },
        { status: 404 },
      );
    }

    if (result.kind === "not_resolved") {
      return NextResponse.json(
        { error: "Discrepancy is not resolved", reason: "not_resolved" },
        { status: 409 },
      );
    }

    if (result.kind === "membership_diverged") {
      return NextResponse.json(
        {
          error: "Committee membership changed since resolve",
          reason: "membership_diverged",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        ...(result.addressRestoreSkipped
          ? { addressRestoreSkipped: true }
          : {}),
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
  undoCommitteeDiscrepancyHandler,
);
