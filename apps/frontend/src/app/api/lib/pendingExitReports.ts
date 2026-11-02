/**
 * Reading pending Exit Reports: a Leader's report lives on the outgoing
 * member's ACTIVE row while `exitReportedAt` is set. Shared by the committee
 * detail endpoint (one committee) and the Admin queue at
 * `/committees/requests` (every committee).
 */

import type { Prisma } from "@prisma/client";
import { ACTIVE_MEMBERSHIP_STATUS } from "~/app/api/lib/committeeValidation";
import type { PendingExitReport } from "~/lib/validations/committee";

/** Where-clause for pending Exit Reports in a term. */
export function pendingExitReportWhere(
  termId: string,
): Prisma.CommitteeMembershipWhereInput {
  return {
    termId,
    status: ACTIVE_MEMBERSHIP_STATUS,
    exitReportedAt: { not: null },
  };
}

export const PENDING_EXIT_REPORT_INCLUDE = {
  voterRecord: {
    select: { VRCNUM: true, firstName: true, lastName: true },
  },
  exitReportedBy: { select: { id: true, name: true } },
} satisfies Prisma.CommitteeMembershipInclude;

export type PendingExitReportRow = Prisma.CommitteeMembershipGetPayload<{
  include: typeof PENDING_EXIT_REPORT_INCLUDE;
}>;

/**
 * Maps a pending-report row for the caller. The reporter, reason, notes and
 * resignation details are Admin-only. Returns null for a row whose report
 * fields aren't set together (the CHECK constraint prevents it).
 */
export function toPendingExitReport(
  m: PendingExitReportRow,
  viewer: { userId: string; isAdmin: boolean },
): PendingExitReport | null {
  if (!m.exitReportedAt || !m.exitReportedKind) return null;
  return {
    membershipId: m.id,
    voterRecordId: m.voterRecord.VRCNUM,
    firstName: m.voterRecord.firstName ?? "",
    lastName: m.voterRecord.lastName ?? "",
    seatNumber: m.seatNumber,
    kind: m.exitReportedKind,
    reportedAt: m.exitReportedAt.toISOString(),
    isOwnReport: m.exitReportedById === viewer.userId,
    ...(viewer.isAdmin
      ? {
          reportedBy: m.exitReportedBy
            ? { id: m.exitReportedBy.id, name: m.exitReportedBy.name }
            : undefined,
          removalReason: m.removalReason,
          removalNotes: m.removalNotes,
          resignationDateReceived:
            m.resignationDateReceived?.toISOString() ?? null,
          resignationMethod: m.resignationMethod,
        }
      : {}),
  };
}
