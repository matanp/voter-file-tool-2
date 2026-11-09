/**
 * The outgoing half of a replacement (ticket 09): the member a Leader's
 * Submission replaces, and the Exit Report filed on (or paired with) them in
 * the Submission's transaction. Used by `/api/committee/requestAdd`.
 */

import type {
  CommitteeList,
  CommitteeTerm,
  PrivilegeLevel,
  Prisma,
} from "@prisma/client";
import prisma from "~/lib/prisma";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import {
  buildMembershipAuditSubject,
  mergeAuditMetadata,
} from "~/lib/auditMembershipSubject";
import { ACTIVE_MEMBERSHIP_STATUS } from "~/app/api/lib/committeeValidation";
import {
  fileExitReport,
  pairExitReportWithReplacement,
} from "~/app/api/lib/membershipExit";
import {
  type ExitReportFieldsData,
  exitReportedAuditValue,
  pendingExitReportAuditValue,
  toExitReportInput,
} from "~/app/api/lib/exitReportInput";
import { MEMBER_CHANGED_MESSAGE } from "~/app/api/lib/exitReportAccess";

/** What a replacement request says about the outgoing member's exit. */
export type OutgoingExitRequest = {
  /** The exit to file, or to rewrite the pending report with. */
  exitReport?: ExitReportFieldsData;
  /** The pending report the Leader saw (ISO), when there was one. */
  existingExitReportedAt?: string;
};

/** The outgoing member's row in the committee and term, with its voter. */
export function findOutgoingMember(
  voterRecordId: string,
  committeeListId: number,
  termId: string,
) {
  return prisma.committeeMembership.findUnique({
    where: {
      voterRecordId_committeeListId_termId: {
        voterRecordId,
        committeeListId,
        termId,
      },
    },
    include: {
      voterRecord: {
        select: {
          VRCNUM: true,
          firstName: true,
          middleInitial: true,
          lastName: true,
        },
      },
    },
  });
}

export type OutgoingMember = NonNullable<
  Awaited<ReturnType<typeof findOutgoingMember>>
>;

/** Why a replacement can't proceed against this outgoing member. */
export type OutgoingMemberProblem = { status: 409 | 422; error: string };

/**
 * The outgoing member must be ACTIVE here, and its pending report (if any) the
 * one the Leader saw. Without a pending report, the request must carry the
 * exit. Pairing (already paired with someone else) is checked separately, after
 * the retry check.
 */
export function outgoingMemberProblem(
  outgoing: OutgoingMember | null,
  request: OutgoingExitRequest,
): OutgoingMemberProblem | null {
  if (!outgoing || outgoing.status !== ACTIVE_MEMBERSHIP_STATUS) {
    return {
      status: 422,
      error:
        "The member being replaced is not an active member of this committee",
    };
  }
  if (outgoing.exitReportedAt === null) {
    if (request.existingExitReportedAt !== undefined) {
      return { status: 409, error: MEMBER_CHANGED_MESSAGE };
    }
    if (request.exitReport === undefined) {
      return {
        status: 422,
        error:
          "Say whether the member being replaced resigned or should be removed",
      };
    }
    return null;
  }
  if (request.existingExitReportedAt === undefined) {
    return {
      status: 409,
      error:
        "An exit has already been reported for the member being replaced. Refresh to see it.",
    };
  }
  if (
    outgoing.exitReportedAt.getTime() !==
    new Date(request.existingExitReportedAt).getTime()
  ) {
    return { status: 409, error: MEMBER_CHANGED_MESSAGE };
  }
  return null;
}

/** `changed`: the conditional write lost a race; the caller rolls back (409). */
export type OutgoingExitResult = "written" | "changed";

/**
 * In the Submission's transaction: files the outgoing member's report paired
 * with `candidateId`, or pairs the pending report the Leader saw (rewriting it
 * when `exitReport` is given), and audits any report written.
 */
export async function fileOutgoingExit(
  tx: Prisma.TransactionClient,
  params: {
    outgoing: OutgoingMember;
    candidateId: string;
    exitReport: ExitReportFieldsData | undefined;
    actor: { userId: string; privilegeLevel: PrivilegeLevel };
    committee: Pick<
      CommitteeList,
      "id" | "cityTown" | "legDistrict" | "electionDistrict"
    > & { term: Pick<CommitteeTerm, "id" | "label"> };
  },
): Promise<OutgoingExitResult> {
  const { outgoing, candidateId, exitReport, actor, committee } = params;
  const reported = exitReport
    ? toExitReportInput(exitReport, actor.userId)
    : undefined;
  const before = outgoing.exitReportedAt;
  const at =
    before === null
      ? reported &&
        (await fileExitReport(tx, outgoing.id, reported, {
          replacementMembershipId: candidateId,
        }))
      : await pairExitReportWithReplacement(tx, outgoing.id, {
          expectedExitReportedAt: before,
          replacementMembershipId: candidateId,
          report: reported,
        });
  if (!at) return "changed";
  if (!reported) return "written"; // paired as reported; nothing new to audit

  await logAuditEventOrThrow(
    actor.userId,
    actor.privilegeLevel,
    "MEMBER_EXIT_REPORTED",
    "CommitteeMembership",
    outgoing.id,
    before === null
      ? { status: ACTIVE_MEMBERSHIP_STATUS }
      : pendingExitReportAuditValue({ ...outgoing, exitReportedAt: before }),
    exitReportedAuditValue(at, reported),
    mergeAuditMetadata(
      {
        reason: "replacement",
        replacementMembershipId: candidateId,
        ...(before !== null ? { updatedReport: true } : {}),
      },
      buildMembershipAuditSubject({
        voterRecord: outgoing.voterRecord,
        committee,
        term: committee.term,
        seatNumber: outgoing.seatNumber,
      }),
    ),
    tx,
  );
  return "written";
}
