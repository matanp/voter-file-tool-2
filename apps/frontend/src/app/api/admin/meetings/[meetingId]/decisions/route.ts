/**
 * SRS 2.4 — POST /api/admin/meetings/[meetingId]/decisions
 * Bulk confirm/reject SUBMITTED memberships within a single transaction.
 */

import { PrivilegeLevel } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { logAuditEvent } from "~/lib/auditLog";
import { bulkDecisionSchema } from "~/lib/validations/committee";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import { ensureSeatsExist, assignNextAvailableSeat } from "~/app/api/lib/seatUtils";
import {
  withPrivilege,
  type SessionWithUser,
} from "~/app/api/lib/withPrivilege";

type RouteContext = { params?: Promise<{ meetingId: string }> };

type DecisionResult = {
  membershipId: string;
  decision: "confirm" | "reject";
  success: boolean;
  error?: string;
};

async function bulkDecisionsHandler(
  req: NextRequest,
  session: SessionWithUser,
  ...contextArgs: unknown[]
) {
  const context = contextArgs[0] as RouteContext | undefined;
  const params = context?.params;
  if (!params) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { meetingId } = await params;

  const body = (await req.json()) as unknown;
  const validation = validateRequest(body, bulkDecisionSchema);
  if (!validation.success) return validation.response;

  const { decisions } = validation.data;
  const userId = session.user.id;
  const userRole = session.user.privilegeLevel ?? PrivilegeLevel.Admin;

  try {
    // Verify meeting exists
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

    const results = await prisma.$transaction(async (tx) => {
      const decisionResults: DecisionResult[] = [];

      for (const { membershipId, decision, rejectionNote } of decisions) {
        const membership = await tx.committeeMembership.findUnique({
          where: { id: membershipId },
        });

        if (!membership) {
          decisionResults.push({
            membershipId,
            decision,
            success: false,
            error: "Membership not found",
          });
          continue;
        }

        if (membership.status !== "SUBMITTED") {
          decisionResults.push({
            membershipId,
            decision,
            success: false,
            error: `Membership status is ${membership.status}, expected SUBMITTED`,
          });
          continue;
        }

        if (decision === "confirm") {
          // Ensure seats exist for this committee+term
          try {
            await ensureSeatsExist(membership.committeeListId, activeTermId, { tx });
          } catch {
            // Non-fatal: seats may already exist
          }

          // Attempt seat assignment
          let seatNumber: number;
          try {
            seatNumber = await assignNextAvailableSeat(
              membership.committeeListId,
              activeTermId,
              { tx },
            );
          } catch {
            decisionResults.push({
              membershipId,
              decision,
              success: false,
              error: "No available seats — committee is at capacity",
            });
            continue;
          }

          const now = new Date();
          const beforeSnapshot = {
            status: membership.status,
            membershipType: membership.membershipType,
            seatNumber: membership.seatNumber,
            confirmedAt: membership.confirmedAt,
            activatedAt: membership.activatedAt,
            meetingRecordId: membership.meetingRecordId,
          };

          // SUBMITTED → CONFIRMED → ACTIVE (per v1 spec, immediate activation)
          await tx.committeeMembership.update({
            where: { id: membershipId },
            data: {
              status: "ACTIVE",
              confirmedAt: now,
              activatedAt: now,
              seatNumber,
              meetingRecordId: meetingId,
              membershipType: membership.membershipType ?? "APPOINTED",
            },
          });

          const afterSnapshot = {
            status: "ACTIVE",
            membershipType: membership.membershipType ?? "APPOINTED",
            seatNumber,
            confirmedAt: now.toISOString(),
            activatedAt: now.toISOString(),
            meetingRecordId: meetingId,
          };

          await logAuditEvent(
            userId,
            userRole,
            "MEMBER_CONFIRMED",
            "CommitteeMembership",
            membershipId,
            beforeSnapshot,
            afterSnapshot,
            { meetingRecordId: meetingId },
            tx,
          );

          await logAuditEvent(
            userId,
            userRole,
            "MEMBER_ACTIVATED",
            "CommitteeMembership",
            membershipId,
            { status: "CONFIRMED" },
            afterSnapshot,
            { meetingRecordId: meetingId },
            tx,
          );

          decisionResults.push({
            membershipId,
            decision,
            success: true,
          });
        } else {
          // Reject path
          const now = new Date();
          const beforeSnapshot = {
            status: membership.status,
            rejectedAt: membership.rejectedAt,
            rejectionNote: membership.rejectionNote,
            meetingRecordId: membership.meetingRecordId,
          };

          await tx.committeeMembership.update({
            where: { id: membershipId },
            data: {
              status: "REJECTED",
              rejectedAt: now,
              rejectionNote: rejectionNote ?? null,
              meetingRecordId: meetingId,
            },
          });

          await logAuditEvent(
            userId,
            userRole,
            "MEMBER_REJECTED",
            "CommitteeMembership",
            membershipId,
            beforeSnapshot,
            {
              status: "REJECTED",
              rejectedAt: now.toISOString(),
              rejectionNote: rejectionNote ?? null,
              meetingRecordId: meetingId,
            },
            { meetingRecordId: meetingId },
            tx,
          );

          decisionResults.push({
            membershipId,
            decision,
            success: true,
          });
        }
      }

      return decisionResults;
    });

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error("Error processing bulk decisions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(
  PrivilegeLevel.Admin,
  bulkDecisionsHandler,
);
