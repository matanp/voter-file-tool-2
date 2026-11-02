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
 */

import type {
  CommitteeMembership,
  ExitReportKind,
  Prisma,
  RemovalReason,
  ResignationMethod,
} from "@prisma/client";
import { ACTIVE_MEMBERSHIP_STATUS } from "~/app/api/lib/committeeValidation";

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
  | "exitReportedKind";

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

export const CLEARED_EXIT_REPORT_FIELDS = {
  exitReportedAt: null,
  exitReportedById: null,
  exitReportedKind: null,
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
    "exitReportedAt" | "exitReportedById" | "exitReportedKind"
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

/**
 * Files an Exit Report on an ACTIVE row with no pending report. The member
 * stays ACTIVE and seated. Returns the stored `exitReportedAt`, or null when
 * the row isn't ACTIVE or already has a report.
 */
export async function fileExitReport(
  tx: Prisma.TransactionClient,
  membershipId: string,
  report: ExitReportInput,
): Promise<Date | null> {
  const reportedAt = new Date();
  const { count } = await tx.committeeMembership.updateMany({
    where: {
      id: membershipId,
      status: ACTIVE_MEMBERSHIP_STATUS,
      exitReportedAt: null,
    },
    data: {
      exitReportedAt: reportedAt,
      exitReportedById: report.reportedById,
      exitReportedKind: report.kind,
      resignationDateReceived: report.resignationDateReceived,
      resignationMethod: report.resignationMethod,
      removalReason: report.removalReason,
      removalNotes: report.removalNotes,
    },
  });
  return count === 0 ? null : reportedAt;
}

/**
 * Rejects the pending report the Admin saw: clears the report and the four
 * exit fields, leaving the member ACTIVE. False when the row changed.
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
