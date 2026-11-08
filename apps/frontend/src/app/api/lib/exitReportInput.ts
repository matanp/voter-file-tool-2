/**
 * Turning a Leader's validated exit fields into what `fileExitReport` stores
 * and what its `MEMBER_EXIT_REPORTED` audit row records. Shared by the
 * standalone report (`/api/committee/exitReport`) and a replacement's outgoing
 * half (`/api/committee/requestAdd`, ticket 09).
 */

import type { ExitReportKind, RemovalReason, ResignationMethod } from "@prisma/client";
import { blankToNull } from "~/lib/blankToNull";
import type { ExitReportInput } from "~/app/api/lib/membershipExit";

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
  fields: ExitReportFieldsData,
  input: ExitReportInput,
): Record<string, unknown> {
  return {
    status: "ACTIVE",
    exitReportedAt: reportedAt.toISOString(),
    exitReportedKind: input.kind,
    ...(input.removalReason ? { removalReason: input.removalReason } : {}),
    ...(input.removalNotes ? { removalNotes: input.removalNotes } : {}),
    ...(input.resignationDateReceived && fields.resignationDateReceived
      ? { resignationDateReceived: fields.resignationDateReceived }
      : {}),
    ...(input.resignationMethod
      ? { resignationMethod: input.resignationMethod }
      : {}),
  };
}
