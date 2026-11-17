/**
 * SRS 2.4 — POST /api/admin/meetings/[meetingId]/decisions
 * Bulk confirm/reject SUBMITTED memberships within a single transaction.
 *
 * One transaction, so the items see each other's writes (capacity and seats
 * are counted under the committee lock as each item lands) and an unexpected
 * error rolls the whole batch back. Each decision runs in its own savepoint:
 * an expected failure that throws (a paired Exit Report that changed, the
 * one-active-membership-per-term index) undoes only that item's writes and is
 * reported in `results` like every other per-item failure.
 */

import { PrivilegeLevel, type Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "~/lib/prisma";
import { bulkDecisionSchema } from "~/lib/validations/committee";
import { validateRequest } from "~/app/api/lib/validateRequest";
import { getGovernanceConfig } from "~/app/api/lib/committeeValidation";
import {
  confirmSubmittedMembership,
  membershipDecisionError,
  membershipDecisionFailureFromError,
  rejectSubmittedMembership,
  type ConfirmSubmittedMembershipResult,
  type MembershipDecisionFailure,
  type RejectSubmittedMembershipResult,
} from "~/app/api/lib/membershipConfirmation";
import { withSavepoint } from "~/app/api/lib/savepoint";
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

/**
 * Runs one decision in its own savepoint. An expected failure, returned or
 * thrown, becomes the item's error; an unexpected error propagates and rolls
 * the batch back.
 */
async function runDecision(
  tx: Prisma.TransactionClient,
  decide: () => Promise<
    ConfirmSubmittedMembershipResult | RejectSubmittedMembershipResult
  >,
): Promise<{ success: true } | { success: false; error: string }> {
  let outcome:
    | ConfirmSubmittedMembershipResult
    | RejectSubmittedMembershipResult
    | MembershipDecisionFailure;
  try {
    outcome = await withSavepoint(tx, decide);
  } catch (error) {
    const failure = membershipDecisionFailureFromError(error);
    if (!failure) throw error;
    outcome = failure;
  }
  if (outcome.kind === "accepted" || outcome.kind === "rejected") {
    return { success: true };
  }
  return { success: false, error: membershipDecisionError(outcome).message };
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

          decisionResults.push({
            membershipId,
            decision,
            ...(await runDecision(tx, () =>
              confirmSubmittedMembership(tx, {
                membershipId,
                meetingRecordId: meetingId,
                actor,
                maxSeats,
                membershipType: membership.membershipType ?? "APPOINTED",
                auditMetadata: { meetingRecordId: meetingId },
              }),
            )),
          });
        } else {
          decisionResults.push({
            membershipId,
            decision,
            ...(await runDecision(tx, () =>
              rejectSubmittedMembership(tx, {
                membershipId,
                actor,
                meetingRecordId: meetingId,
                rejectionNote: rejectionNote ?? null,
                auditMetadata: { meetingRecordId: meetingId },
              }),
            )),
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
