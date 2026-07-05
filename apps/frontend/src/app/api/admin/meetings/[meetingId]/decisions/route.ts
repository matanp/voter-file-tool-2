/**
 * SRS 2.4 — POST /api/admin/meetings/[meetingId]/decisions
 * Bulk confirm/reject SUBMITTED memberships within a single transaction.
 */

import { PrivilegeLevel } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { bulkDecisionSchema } from "~/lib/validations/committee";
import { validateRequest } from "~/app/api/lib/validateRequest";
import {
  ALREADY_IN_ANOTHER_COMMITTEE_ERROR,
  getGovernanceConfig,
  isActiveMembershipPerTermConflict,
} from "~/app/api/lib/committeeValidation";
import {
  confirmSubmittedMembership,
  rejectSubmittedMembership,
  type ConfirmSubmittedMembershipResult,
} from "~/app/api/lib/membershipConfirmation";
import { validateEligibility } from "~/lib/eligibility";
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

function confirmErrorMessage(
  kind: Exclude<ConfirmSubmittedMembershipResult["kind"], "accepted">,
): string {
  switch (kind) {
    case "notFound":
      return "Membership not found";
    case "notSubmitted":
      return "Membership is not in SUBMITTED status";
    case "anotherCommittee":
      return ALREADY_IN_ANOTHER_COMMITTEE_ERROR;
    case "replacementTargetInvalid":
      return "Replacement target not found or no longer active";
    case "atCapacity":
      return "Committee is at capacity";
  }
}

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
  const actor = { userId, userRole };

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

    const config = await getGovernanceConfig();
    const maxSeats = config.maxSeatsPerLted;

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
          const eligibility = await validateEligibility(
            membership.voterRecordId,
            membership.committeeListId,
            membership.termId,
          );
          if (eligibility.validationError) {
            decisionResults.push({
              membershipId,
              decision,
              success: false,
              error: eligibility.validationError,
            });
            continue;
          }
          if (!eligibility.eligible) {
            decisionResults.push({
              membershipId,
              decision,
              success: false,
              error: `Ineligible at decision time: ${eligibility.hardStops.join(", ")}`,
            });
            continue;
          }

          try {
            const outcome = await confirmSubmittedMembership(tx, {
              membershipId,
              meetingRecordId: meetingId,
              actor,
              maxSeats,
              membershipType: membership.membershipType ?? "APPOINTED",
              auditMetadata: { meetingRecordId: meetingId },
            });

            if (outcome.kind === "accepted") {
              decisionResults.push({
                membershipId,
                decision,
                success: true,
              });
            } else {
              decisionResults.push({
                membershipId,
                decision,
                success: false,
                error: confirmErrorMessage(outcome.kind),
              });
            }
          } catch (error) {
            if (isActiveMembershipPerTermConflict(error)) {
              decisionResults.push({
                membershipId,
                decision,
                success: false,
                error: ALREADY_IN_ANOTHER_COMMITTEE_ERROR,
              });
              continue;
            }
            throw error;
          }
        } else {
          const outcome = await rejectSubmittedMembership(tx, {
            membershipId,
            actor,
            meetingRecordId: meetingId,
            rejectionNote: rejectionNote ?? null,
            auditMetadata: { meetingRecordId: meetingId },
          });

          if (outcome.kind === "rejected") {
            decisionResults.push({
              membershipId,
              decision,
              success: true,
            });
          } else if (outcome.kind === "notFound") {
            decisionResults.push({
              membershipId,
              decision,
              success: false,
              error: "Membership not found",
            });
          } else {
            decisionResults.push({
              membershipId,
              decision,
              success: false,
              error: `Membership status is not SUBMITTED`,
            });
          }
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
