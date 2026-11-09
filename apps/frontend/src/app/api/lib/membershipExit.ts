/**
 * Every write that moves a CommitteeMembership out of ACTIVE into RESIGNED or
 * REMOVED, plus the Exit Report writes (file, reject) that live on the same
 * columns. See docs/adr/0002-exit-reports-on-the-membership-row.md.
 *
 * The rules this module holds in one place:
 *
 * - An exit write sets the status, its timestamp, and **all four** exit fields
 *   (`resignationDateReceived`, `resignationMethod`, `removalReason`,
 *   `removalNotes`) explicitly, to the path's value or `null`. A Leader's
 *   reported details never survive as if they were recorded facts.
 * - The same write clears the three report fields (`exitReportedAt`,
 *   `exitReportedById`, `exitReportedKind`). The DB CHECK constraints are the
 *   backstop: a path that skips this helper and leaves a report on a
 *   non-ACTIVE row fails loudly.
 * - Writes are conditional on the row still being ACTIVE. Confirming a report
 *   also requires it to be exactly the report the Admin saw (409 otherwise);
 *   other exits supersede whatever report the row has when they land.
 * - A replacement pairs a candidate's Submission with the outgoing member's
 *   report through `replacementMembershipId` on the outgoing row (ticket 09).
 *   It is part of the report: every write that clears the report clears it,
 *   and a CHECK constraint allows it only while the report is pending.
 */

import type {
  CommitteeMembership,
  ExitReportKind,
  Prisma,
  PrivilegeLevel,
  RemovalReason,
  ResignationMethod,
} from "@prisma/client";
import { ACTIVE_MEMBERSHIP_STATUS } from "~/app/api/lib/committeeValidation";
import { pendingExitReportAuditValue } from "~/app/api/lib/exitReportInput";
import { logAuditEventOrThrow } from "~/lib/auditLog";
import {
  type AuditMembershipSubject,
  mergeAuditMetadata,
} from "~/lib/auditMembershipSubject";

export type MembershipExitFields = {
  resignationDateReceived: Date | null;
  resignationMethod: ResignationMethod | null;
  removalReason: RemovalReason | null;
  removalNotes: string | null;
};

/**
 * Columns this module owns; a path's `extra` may not write them. (The other
 * exit's timestamp is allowed: a discrepancy undo restores both.)
 */
type ExitOwnedColumn =
  | keyof MembershipExitFields
  | "status"
  | "exitReportedAt"
  | "exitReportedById"
  | "exitReportedKind"
  | "replacementMembershipId";

export type MembershipExit = MembershipExitFields & {
  status: "RESIGNED" | "REMOVED";
  /**
   * `resignedAt` for RESIGNED, `removedAt` for REMOVED. Defaults to now; a
   * discrepancy undo passes the saved value (which may be null).
   */
  at?: Date | null;
  /** Other columns the path writes in the same update, e.g. `seatNumber: null`. */
  extra?: Omit<Prisma.CommitteeMembershipUncheckedUpdateInput, ExitOwnedColumn>;
};

/** The report fields as they were on the row before a write cleared them. */
export type ClearedExitReport = {
  reportedById: string | null;
  /** ISO timestamp. */
  reportedAt: string;
  kind: ExitReportKind;
};

export type MembershipExitResult =
  | {
      kind: "written";
      /** The row after the write. */
      membership: CommitteeMembership;
      /** The pending report this write cleared, if there was one. */
      clearedReport: ClearedExitReport | null;
    }
  /**
   * Nothing written: the row is no longer ACTIVE, its report changed since it
   * was read, or it didn't match `expectedExitReportedAt`.
   */
  | { kind: "changed" };

/** The report fields, and the replacement pairing that belongs to the report. */
export const CLEARED_EXIT_REPORT_FIELDS = {
  exitReportedAt: null,
  exitReportedById: null,
  exitReportedKind: null,
  replacementMembershipId: null,
} as const satisfies Prisma.CommitteeMembershipUncheckedUpdateManyInput;

export const CLEARED_EXIT_FIELDS = {
  resignationDateReceived: null,
  resignationMethod: null,
  removalReason: null,
  removalNotes: null,
} as const satisfies MembershipExitFields;

/**
 * The row as the caller read it. Every caller has already loaded the
 * membership and checked it is ACTIVE. The helper locks and rereads it before
 * writing so superseding exits do not depend on how often the report state
 * changed before the lock was acquired.
 */
export type ExitReportState = {
  id: string;
  exitReportedAt: Date | null;
  exitReportedById: string | null;
  exitReportedKind: ExitReportKind | null;
};

/** `select` for reads that feed `writeMembershipExit`. */
export const EXIT_REPORT_STATE_SELECT = {
  id: true,
  exitReportedAt: true,
  exitReportedById: true,
  exitReportedKind: true,
} as const satisfies Prisma.CommitteeMembershipSelect;

function toClearedReport(state: ExitReportState): ClearedExitReport | null {
  if (state.exitReportedAt == null || state.exitReportedKind == null) {
    return null;
  }
  return {
    reportedById: state.exitReportedById,
    reportedAt: state.exitReportedAt.toISOString(),
    kind: state.exitReportedKind,
  };
}

function sameInstant(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) return a === b;
  return a.getTime() === b.getTime();
}

function isRecordNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2025"
  );
}

/**
 * First tries the report state the caller read. Confirming is exact: a miss is
 * the caller's 409. A superseding exit locks and rereads after a miss, then
 * writes based only on `status = ACTIVE`. This keeps the common path cheap
 * while making report/reject/refile churn irrelevant once the lock is held.
 */
async function updateIfUnchanged(
  tx: Prisma.TransactionClient,
  state: ExitReportState,
  data: Prisma.CommitteeMembershipUncheckedUpdateInput,
  mode: "exact" | "supersede",
): Promise<MembershipExitResult> {
  try {
    const membership = await tx.committeeMembership.update({
      where: {
        id: state.id,
        status: ACTIVE_MEMBERSHIP_STATUS,
        // `?? null`: an undefined filter would match any report.
        exitReportedAt: state.exitReportedAt ?? null,
      },
      data: { ...data, ...CLEARED_EXIT_REPORT_FIELDS },
    });
    return {
      kind: "written",
      membership,
      clearedReport: toClearedReport(state),
    };
  } catch (error) {
    if (!isRecordNotFound(error)) throw error;
    if (mode === "exact") return { kind: "changed" };
  }

  await tx.$queryRaw`
    SELECT "id"
    FROM "CommitteeMembership"
    WHERE "id" = ${state.id}
    FOR UPDATE
  `;
  const current = await tx.committeeMembership.findUnique({
    where: { id: state.id },
    select: { ...EXIT_REPORT_STATE_SELECT, status: true },
  });
  if (!current || current.status !== ACTIVE_MEMBERSHIP_STATUS) {
    return { kind: "changed" };
  }

  try {
    const membership = await tx.committeeMembership.update({
      where: { id: current.id, status: ACTIVE_MEMBERSHIP_STATUS },
      data: { ...data, ...CLEARED_EXIT_REPORT_FIELDS },
    });
    return {
      kind: "written",
      membership,
      clearedReport: toClearedReport(current),
    };
  } catch (error) {
    if (!isRecordNotFound(error)) throw error;
    return { kind: "changed" };
  }
}

/**
 * Audit metadata for an exit that wasn't the confirmation of the report it
 * cleared (decision 15): `{ supersededExitReport }`, or nothing.
 */
export function supersededExitReportMetadata(
  result: Extract<MembershipExitResult, { kind: "written" }>,
): { supersededExitReport?: ClearedExitReport } {
  return result.clearedReport
    ? { supersededExitReport: result.clearedReport }
    : {};
}

/**
 * Moves an ACTIVE membership to RESIGNED / REMOVED. The only way to write
 * those statuses.
 *
 * With `expectedExitReportedAt` (confirming an Exit Report), the row's
 * pending report must be exactly that one; a report rejected and filed again
 * in between is refused as `changed`.
 */
export async function writeMembershipExit(
  tx: Prisma.TransactionClient,
  state: ExitReportState,
  exit: MembershipExit,
  options: { expectedExitReportedAt?: Date } = {},
): Promise<MembershipExitResult> {
  if (
    options.expectedExitReportedAt !== undefined &&
    !sameInstant(state.exitReportedAt, options.expectedExitReportedAt)
  ) {
    return { kind: "changed" };
  }
  const at = exit.at === undefined ? new Date() : exit.at;
  const mode =
    options.expectedExitReportedAt !== undefined ? "exact" : "supersede";
  return updateIfUnchanged(
    tx,
    state,
    {
      ...exit.extra,
      status: exit.status,
      ...(exit.status === "RESIGNED" ? { resignedAt: at } : { removedAt: at }),
      resignationDateReceived: exit.resignationDateReceived,
      resignationMethod: exit.resignationMethod,
      removalReason: exit.removalReason,
      removalNotes: exit.removalNotes,
    },
    mode,
  );
}

/**
 * Moves an ACTIVE membership to a status that isn't an exit (a discrepancy
 * undo restoring SUBMITTED, REJECTED, …), clearing any pending report in the
 * same write.
 */
export async function writeMembershipLeavingActive(
  tx: Prisma.TransactionClient,
  state: ExitReportState,
  data: Omit<
    Prisma.CommitteeMembershipUncheckedUpdateInput,
    | "exitReportedAt"
    | "exitReportedById"
    | "exitReportedKind"
    | "replacementMembershipId"
  >,
): Promise<MembershipExitResult> {
  if (data.status === "RESIGNED" || data.status === "REMOVED") {
    throw new Error("Exit statuses must be written with writeMembershipExit");
  }
  return updateIfUnchanged(tx, state, data, "supersede");
}

export type ExitReportInput = MembershipExitFields & {
  kind: ExitReportKind;
  reportedById: string;
};

/** Every report field and exit field, as a report writes them. */
function reportData(report: ExitReportInput, reportedAt: Date) {
  return {
    exitReportedAt: reportedAt,
    exitReportedById: report.reportedById,
    exitReportedKind: report.kind,
    resignationDateReceived: report.resignationDateReceived,
    resignationMethod: report.resignationMethod,
    removalReason: report.removalReason,
    removalNotes: report.removalNotes,
  } satisfies Prisma.CommitteeMembershipUncheckedUpdateManyInput;
}

/**
 * Files an Exit Report on an ACTIVE row with no pending report. The member
 * stays ACTIVE and seated. With `replacementMembershipId`, the report is the
 * outgoing half of a replacement. Returns the stored `exitReportedAt`, or null
 * when the row isn't ACTIVE or already has a report.
 */
export async function fileExitReport(
  tx: Prisma.TransactionClient,
  membershipId: string,
  report: ExitReportInput,
  options: { replacementMembershipId?: string } = {},
): Promise<Date | null> {
  const reportedAt = new Date();
  const { count } = await tx.committeeMembership.updateMany({
    where: {
      id: membershipId,
      status: ACTIVE_MEMBERSHIP_STATUS,
      exitReportedAt: null,
    },
    data: {
      ...reportData(report, reportedAt),
      replacementMembershipId: options.replacementMembershipId ?? null,
    },
  });
  return count === 0 ? null : reportedAt;
}

/**
 * Pairs a replacement candidate with the pending report the Leader saw, and,
 * with `report`, rewrites that report: every report and exit field, with a new
 * `exitReportedAt`, so an Admin looking at the old report can't confirm the
 * new one. Conditional on the row still being ACTIVE with that report and
 * unpaired. Returns the row's `exitReportedAt` afterwards, or null when it
 * changed.
 */
export async function pairExitReportWithReplacement(
  tx: Prisma.TransactionClient,
  membershipId: string,
  {
    expectedExitReportedAt,
    replacementMembershipId,
    report,
  }: {
    expectedExitReportedAt: Date;
    replacementMembershipId: string;
    report?: ExitReportInput;
  },
): Promise<Date | null> {
  const reportedAt = report ? new Date() : expectedExitReportedAt;
  const { count } = await tx.committeeMembership.updateMany({
    where: {
      id: membershipId,
      status: ACTIVE_MEMBERSHIP_STATUS,
      exitReportedAt: expectedExitReportedAt,
      replacementMembershipId: null,
    },
    data: {
      ...(report ? reportData(report, reportedAt) : {}),
      replacementMembershipId,
    },
  });
  return count === 0 ? null : reportedAt;
}

/**
 * Unpairs whatever report points at `candidateId`, leaving the report itself
 * pending. For a candidate that left SUBMITTED some other way (an Admin's
 * direct add, a capacity auto-reject) or whose row is being reused for a new
 * submission, so a stale pairing can't attach to it.
 */
export async function unpairReplacement(
  tx: Prisma.TransactionClient,
  candidateId: string,
): Promise<void> {
  await tx.committeeMembership.updateMany({
    where: { replacementMembershipId: candidateId },
    data: { replacementMembershipId: null },
  });
}

/**
 * Moves an existing membership row to ACTIVE; every path that does so goes
 * through here. A row coming from another status (a pending replacement
 * candidate, a rejected or departed member) is unpaired first, so the outgoing
 * member's report stays pending as an ordinary report. (When the candidate is
 * accepted, the outgoing member's exit has already cleared the pairing.)
 * Returns the row after the write.
 */
export async function activateMembership(
  tx: Prisma.TransactionClient,
  row: { id: string; status: CommitteeMembership["status"] },
  data: Omit<
    Prisma.CommitteeMembershipUncheckedUpdateInput,
    | "status"
    | "exitReportedAt"
    | "exitReportedById"
    | "exitReportedKind"
    | "replacementMembershipId"
  >,
): Promise<CommitteeMembership> {
  if (row.status !== ACTIVE_MEMBERSHIP_STATUS) {
    await unpairReplacement(tx, row.id);
  }
  return tx.committeeMembership.update({
    where: { id: row.id },
    data: { status: ACTIVE_MEMBERSHIP_STATUS, ...data },
  });
}

/**
 * Rejects the pending report the Admin saw: clears the report, the four exit
 * fields and any replacement pairing, leaving the member ACTIVE. False when
 * the row changed.
 */
export async function clearRejectedExitReport(
  tx: Prisma.TransactionClient,
  membershipId: string,
  expectedExitReportedAt: Date,
): Promise<boolean> {
  const { count } = await tx.committeeMembership.updateMany({
    where: {
      id: membershipId,
      status: ACTIVE_MEMBERSHIP_STATUS,
      exitReportedAt: expectedExitReportedAt,
    },
    data: { ...CLEARED_EXIT_REPORT_FIELDS, ...CLEARED_EXIT_FIELDS },
  });
  return count > 0;
}

/** The pending report as read, which the rejection's audit row records. */
export type PendingExitReportRow = {
  id: string;
  exitReportedAt: Date;
  exitReportedById: string | null;
  exitReportedKind: ExitReportKind | null;
  removalReason: RemovalReason | null;
  replacementMembershipId: string | null;
};

/**
 * Rejects exactly the pending report `row` was read with
 * (`clearRejectedExitReport`) and audits it as `MEMBER_EXIT_REPORT_REJECTED`:
 * the Admin's reject, and a replacement candidate's reject taking its paired
 * report with it. `metadata` is the path's own (reason, note, …); the
 * reporter and report time are added here. False, with nothing audited, when
 * the row changed.
 */
export async function rejectExitReport(
  tx: Prisma.TransactionClient,
  row: PendingExitReportRow,
  actor: { userId: string; userRole: PrivilegeLevel },
  metadata: Record<string, unknown>,
  subject: AuditMembershipSubject,
): Promise<boolean> {
  if (!(await clearRejectedExitReport(tx, row.id, row.exitReportedAt))) {
    return false;
  }
  await logAuditEventOrThrow(
    actor.userId,
    actor.userRole,
    "MEMBER_EXIT_REPORT_REJECTED",
    "CommitteeMembership",
    row.id,
    pendingExitReportAuditValue(row),
    { status: ACTIVE_MEMBERSHIP_STATUS },
    mergeAuditMetadata(
      {
        ...metadata,
        reportedById: row.exitReportedById,
        reportedAt: row.exitReportedAt.toISOString(),
      },
      subject,
    ),
    tx,
  );
  return true;
}

type ReportedExitRow = MembershipExitFields & {
  exitReportedKind: ExitReportKind | null;
};

/**
 * The exit a pending report records when an Admin confirms it, exactly as
 * reported, with the audit's after-values. `incomplete` for a report filed
 * before the kind's details were required (SRS §6.5): it can only be rejected.
 */
export function reportedExit(
  row: ReportedExitRow,
):
  | { kind: "ok"; exit: MembershipExit; afterValue: Record<string, unknown> }
  | { kind: "incomplete"; message: string } {
  const notes = row.removalNotes;
  if (row.exitReportedKind === "RESIGNATION") {
    const { resignationDateReceived, resignationMethod } = row;
    if (!resignationDateReceived || !resignationMethod) {
      return {
        kind: "incomplete",
        message:
          "This report is missing the date received or the method. Reject it so the Leader can report it again.",
      };
    }
    return {
      kind: "ok",
      exit: {
        status: "RESIGNED",
        resignationDateReceived,
        resignationMethod,
        removalReason: null,
        removalNotes: notes,
      },
      afterValue: {
        status: "RESIGNED",
        // "YYYY-MM-DD", as the Admin's Record resignation audit stores it.
        resignationDateReceived: resignationDateReceived.toISOString().slice(0, 10),
        resignationMethod,
        ...(notes ? { removalNotes: notes } : {}),
      },
    };
  }
  const { removalReason } = row;
  if (!removalReason) {
    return {
      kind: "incomplete",
      message:
        "This report has no reason. Reject it so the Leader can report it again.",
    };
  }
  return {
    kind: "ok",
    exit: {
      status: "REMOVED",
      resignationDateReceived: null,
      resignationMethod: null,
      removalReason,
      removalNotes: notes,
    },
    afterValue: {
      status: "REMOVED",
      removalReason,
      ...(notes ? { removalNotes: notes } : {}),
    },
  };
}
