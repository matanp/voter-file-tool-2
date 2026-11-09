/**
 * Turning a Leader's validated exit fields into what `fileExitReport` stores
 * and what its `MEMBER_EXIT_REPORTED` audit row records. Shared by the
 * standalone report (`/api/committee/exitReport`) and a replacement's outgoing
 * half (`/api/committee/requestAdd`, ticket 09).
 */

import type { ExitReportKind, RemovalReason, ResignationMethod } from "@prisma/client";
import { blankToNull } from "~/lib/blankToNull";
import type { ExitReportInput } from "~/app/api/lib/membershipExit";
import { ACTIVE_MEMBERSHIP_STATUS } from "~/app/api/lib/committeeValidation";

/** The fields `reportExitDataSchema` / `replacementExitReportSchema` accept. */
export type ExitReportFieldsData = {
  kind: ExitReportKind;
  removalReason?: RemovalReason;
  removalNotes?: string;
  resignationDateReceived?: string;
  resignationMethod?: ResignationMethod;
};

/** Only the chosen kind's fields; notes either way. */
export function toExitReportInput(
  fields: ExitReportFieldsData,
  reportedById: string,
): ExitReportInput {
  const isResignation = fields.kind === "RESIGNATION";
  return {
    kind: fields.kind,
    reportedById,
    resignationDateReceived:
      isResignation && fields.resignationDateReceived
        ? new Date(fields.resignationDateReceived)
        : null,
    resignationMethod: isResignation ? (fields.resignationMethod ?? null) : null,
    removalReason: isResignation ? null : (fields.removalReason ?? null),
    removalNotes: blankToNull(fields.removalNotes),
  };
}

/** `afterValue` of a `MEMBER_EXIT_REPORTED` row. */
export function exitReportedAuditValue(
  reportedAt: Date,
  input: ExitReportInput,
): Record<string, unknown> {
  return {
    status: ACTIVE_MEMBERSHIP_STATUS,
    exitReportedAt: reportedAt.toISOString(),
    exitReportedKind: input.kind,
    ...(input.removalReason ? { removalReason: input.removalReason } : {}),
    ...(input.removalNotes ? { removalNotes: input.removalNotes } : {}),
    // "YYYY-MM-DD": `toExitReportInput` parses it as UTC midnight, so this
    // round-trips to what the Leader sent.
    ...(input.resignationDateReceived
      ? {
          resignationDateReceived: input.resignationDateReceived
            .toISOString()
            .slice(0, 10),
        }
      : {}),
    ...(input.resignationMethod
      ? { resignationMethod: input.resignationMethod }
      : {}),
  };
}

/**
 * A pending report as audit rows record it before a write changes it: the
 * `beforeValue` of `MEMBER_EXIT_REPORT_REJECTED`, and of a
 * `MEMBER_EXIT_REPORTED` that rewrites an existing report.
 */
export function pendingExitReportAuditValue(row: {
  exitReportedAt: Date;
  exitReportedKind: ExitReportKind | null;
  removalReason: RemovalReason | null;
  replacementMembershipId: string | null;
}): Record<string, unknown> {
  return {
    status: ACTIVE_MEMBERSHIP_STATUS,
    exitReportedAt: row.exitReportedAt.toISOString(),
    exitReportedKind: row.exitReportedKind,
    removalReason: row.removalReason,
    ...(row.replacementMembershipId
      ? { replacementMembershipId: row.replacementMembershipId }
      : {}),
  };
}
