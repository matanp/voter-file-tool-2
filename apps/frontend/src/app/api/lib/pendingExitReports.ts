/**
 * Reading pending Exit Reports: a Leader's report lives on the outgoing
 * member's ACTIVE row while `exitReportedAt` is set. Shared by the committee
 * detail endpoint (one committee) and the Admin queue at
 * `/committees/requests` (every committee).
 */

import { MembershipStatus, type Prisma } from "@prisma/client";
import {
  ACTIVE_MEMBERSHIP_STATUS,
  PENDING_MEMBERSHIP_STATUS,
} from "~/app/api/lib/committeeValidation";
import type { PendingExitReport } from "~/lib/validations/committee";

/** A membership row carrying a pending Exit Report, in any term. */
const exitReportOnRow = {
  status: ACTIVE_MEMBERSHIP_STATUS,
  exitReportedAt: { not: null },
} satisfies Prisma.CommitteeMembershipWhereInput;

/** Where-clause for pending Exit Reports in a term. */
export function pendingExitReportWhere(
  termId: string,
): Prisma.CommitteeMembershipWhereInput {
  return { termId, ...exitReportOnRow };
}

/**
 * Where-clause for everything pending in a term: SUBMITTED memberships
 * awaiting a decision, plus ACTIVE rows carrying a standalone Exit Report. A
 * replacement is one item, counted by its candidate: its paired report
 * (`replacementMembershipId` set) isn't counted again. This is what every
 * "N pending" count shows.
 */
export function pendingItemsWhere(
  termId: string,
): Prisma.CommitteeMembershipWhereInput {
  return {
    termId,
    OR: [
      { status: PENDING_MEMBERSHIP_STATUS },
      { ...exitReportOnRow, replacementMembershipId: null },
    ],
  };
}

export const PENDING_EXIT_REPORT_INCLUDE = {
  voterRecord: {
    select: { VRCNUM: true, firstName: true, lastName: true },
  },
  exitReportedBy: { select: { id: true, name: true } },
  // A replacement's candidate (ticket 09).
  replacementMembership: {
    select: {
      id: true,
      status: true,
      voterRecord: {
        select: { VRCNUM: true, firstName: true, lastName: true },
      },
    },
  },
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
  // Every path that moves a candidate out of SUBMITTED unpairs it; the status
  // check keeps a missed one from showing as a replacement.
  const candidate =
    m.replacementMembership?.status === MembershipStatus.SUBMITTED
      ? m.replacementMembership
      : null;
  return {
    membershipId: m.id,
    voterRecordId: m.voterRecord.VRCNUM,
    firstName: m.voterRecord.firstName ?? "",
    lastName: m.voterRecord.lastName ?? "",
    seatNumber: m.seatNumber,
    kind: m.exitReportedKind,
    reportedAt: m.exitReportedAt.toISOString(),
    isOwnReport: m.exitReportedById === viewer.userId,
    replacement: candidate
      ? {
          membershipId: candidate.id,
          voterRecordId: candidate.voterRecord.VRCNUM,
          firstName: candidate.voterRecord.firstName ?? "",
          lastName: candidate.voterRecord.lastName ?? "",
        }
      : null,
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
