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
 * - The Resignation Letter columns follow the exit fields (ticket 08). Every
 *   exit says what happens to a pending letter (`letter`, required): keep it,
 *   detach it, or attach a new one. A detached letter is returned so the
 *   caller can move its object to `resignation-letters/rejected/` **after**
 *   the transaction commits (`relocateDetachedLetters`). Leaving ACTIVE for a
 *   non-exit status always detaches. Reactivating a RESIGNED row clears the
 *   columns and leaves the object where it is (`CLEARED_LETTER_FIELDS`,
 *   `previousLetterMetadata`).
 */

import type {
  CommitteeMembership,
  ExitReportKind,
  Prisma,
  RemovalReason,
  ResignationMethod,
} from "@prisma/client";
import { ACTIVE_MEMBERSHIP_STATUS } from "~/app/api/lib/committeeValidation";
import {
  isLetterContentType,
  rejectedLetterKey,
  type LetterContentType,
} from "~/lib/resignationLetter";

/** A letter on a membership row: its R2 key, sniffed type, and display name. */
export type ResignationLetter = {
  key: string;
  contentType: LetterContentType;
  fileName: string;
};

/**
 * What an exit does with the row's pending letter:
 *
 * - `"keep"`: the pending resignation report's letter becomes the recorded
 *   one (confirm; an Admin's Record resignation with carry-over ticked).
 * - `"detach"`: the columns are cleared and the letter is returned as
 *   `detachedLetter` (reject, removals, every other superseding exit).
 * - a `ResignationLetter`: a newly uploaded letter; any pending one it
 *   replaces is detached.
 */
export type ExitLetterOption = "keep" | "detach" | ResignationLetter;

type LetterColumns = {
  resignationLetterKey: string | null;
  resignationLetterContentType: string | null;
  resignationLetterFileName: string | null;
};

export const CLEARED_LETTER_FIELDS = {
  resignationLetterKey: null,
  resignationLetterContentType: null,
  resignationLetterFileName: null,
} as const satisfies LetterColumns;

/** The row's letter, or null. */
export function letterOnRow(row: LetterColumns): ResignationLetter | null {
  const { resignationLetterKey: key, resignationLetterContentType: type } = row;
  if (!key || !isLetterContentType(type)) return null;
  return {
    key,
    contentType: type,
    fileName: row.resignationLetterFileName ?? "letter",
  };
}

function letterColumns(letter: ResignationLetter): LetterColumns {
  return {
    resignationLetterKey: letter.key,
    resignationLetterContentType: letter.contentType,
    resignationLetterFileName: letter.fileName,
  };
}

/**
 * Audit metadata for a write that moves a RESIGNED row to another status
 * (reactivation, resubmission): `{ previousLetterKey }` when it had a letter.
 * Pair it with `CLEARED_LETTER_FIELDS` in the write. The object stays in
 * `resignation-letters/<membershipId>/`: a confirmed letter is never moved to
 * the 90-day prefix (decision 15).
 */
export function previousLetterMetadata(row: LetterColumns): {
  previousLetterKey?: string;
} {
  return row.resignationLetterKey
    ? { previousLetterKey: row.resignationLetterKey }
    : {};
}

/**
 * What a write that leaves RESIGNED for a non-exit status adds to its data:
 * the cleared letter columns, only when the row is RESIGNED (an ACTIVE row's
 * pending letter belongs to its report and is left alone).
 */
export function letterClearedOnLeavingResigned(row: {
  status: string;
}): Partial<typeof CLEARED_LETTER_FIELDS> {
  return row.status === "RESIGNED" ? CLEARED_LETTER_FIELDS : {};
}

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
  | keyof LetterColumns
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
  /**
   * Required, so no path can drop a letter silently. A removal can only
   * detach: letters belong to resignations.
   */
  letter: ExitLetterOption;
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
      /**
       * The pending letter this write took off the row, if any. Move it with
       * `relocateDetachedLetters` once the transaction commits.
       */
      detachedLetter: ResignationLetter | null;
      /** The letter the row has after the write (kept, newly attached, or none). */
      letter: ResignationLetter | null;
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
export type ExitReportState = LetterColumns & {
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
  resignationLetterKey: true,
  resignationLetterContentType: true,
  resignationLetterFileName: true,
} as const satisfies Prisma.CommitteeMembershipSelect;

/** The write's data for the row as it is when written, plus the letter it detaches. */
type BuildWrite = (row: ExitReportState) => {
  data: Prisma.CommitteeMembershipUncheckedUpdateInput;
  detachedLetter: ResignationLetter | null;
  letter: ResignationLetter | null;
};

function letterWrite(
  option: ExitLetterOption,
  row: ExitReportState,
): {
  data: Partial<LetterColumns>;
  detachedLetter: ResignationLetter | null;
  letter: ResignationLetter | null;
} {
  const pending = letterOnRow(row);
  if (option === "keep") return { data: {}, detachedLetter: null, letter: pending };
  if (option === "detach") {
    return { data: CLEARED_LETTER_FIELDS, detachedLetter: pending, letter: null };
  }
  return {
    data: letterColumns(option),
    detachedLetter: pending && pending.key !== option.key ? pending : null,
    letter: option,
  };
}

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
  build: BuildWrite,
  mode: "exact" | "supersede",
): Promise<MembershipExitResult> {
  try {
    // The letter is filed with the report and cleared with it, so a row whose
    // `exitReportedAt` still matches still has the letter the caller read.
    const { data, detachedLetter, letter } = build(state);
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
      detachedLetter,
      letter,
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
    const { data, detachedLetter, letter } = build(current);
    const membership = await tx.committeeMembership.update({
      where: { id: current.id, status: ACTIVE_MEMBERSHIP_STATUS },
      data: { ...data, ...CLEARED_EXIT_REPORT_FIELDS },
    });
    return {
      kind: "written",
      membership,
      clearedReport: toClearedReport(current),
      detachedLetter,
      letter,
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

/** How an audit row names a detached letter, which is moved after commit. */
export type DetachedLetterAudit = {
  /** Where the object is moved: under the 90-day `rejected/` prefix. */
  key: string;
  /** Where it was when detached (and stays, if the move fails). */
  originalKey: string;
  fileName: string;
};

export function detachedLetterAudit(
  letter: ResignationLetter,
): DetachedLetterAudit {
  return {
    key: rejectedLetterKey(letter.key),
    originalKey: letter.key,
    fileName: letter.fileName,
  };
}

/**
 * Audit metadata for an exit's letter: `{ detachedResignationLetter }` when it
 * detached one, and `{ resignationLetterKey }` when the row now has one.
 */
export function exitLetterMetadata(
  result: Extract<MembershipExitResult, { kind: "written" }>,
): {
  detachedResignationLetter?: DetachedLetterAudit;
  resignationLetterKey?: string;
} {
  return {
    ...(result.detachedLetter
      ? { detachedResignationLetter: detachedLetterAudit(result.detachedLetter) }
      : {}),
    ...(result.letter ? { resignationLetterKey: result.letter.key } : {}),
  };
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
  if (exit.status === "REMOVED" && exit.letter !== "detach") {
    throw new Error("A removal can only detach a resignation letter");
  }
  const at = exit.at === undefined ? new Date() : exit.at;
  const mode =
    options.expectedExitReportedAt !== undefined ? "exact" : "supersede";
  return updateIfUnchanged(
    tx,
    state,
    (row) => {
      // "keep" keeps only a pending *resignation* report's letter; there is
      // never one on any other row (CHECK constraint).
      const letter = letterWrite(exit.letter, row);
      return {
        data: {
          ...exit.extra,
          status: exit.status,
          ...(exit.status === "RESIGNED"
            ? { resignedAt: at }
            : { removedAt: at }),
          resignationDateReceived: exit.resignationDateReceived,
          resignationMethod: exit.resignationMethod,
          removalReason: exit.removalReason,
          removalNotes: exit.removalNotes,
          ...letter.data,
        },
        detachedLetter: letter.detachedLetter,
        letter: letter.letter,
      };
    },
    mode,
  );
}

/**
 * Moves an ACTIVE membership to a status that isn't an exit (a discrepancy
 * undo restoring SUBMITTED, REJECTED, …), clearing any pending report, and
 * detaching its letter, in the same write.
 */
export async function writeMembershipLeavingActive(
  tx: Prisma.TransactionClient,
  state: ExitReportState,
  data: Omit<
    Prisma.CommitteeMembershipUncheckedUpdateInput,
    "exitReportedAt" | "exitReportedById" | "exitReportedKind" | keyof LetterColumns
  >,
): Promise<MembershipExitResult> {
  if (data.status === "RESIGNED" || data.status === "REMOVED") {
    throw new Error("Exit statuses must be written with writeMembershipExit");
  }
  return updateIfUnchanged(
    tx,
    state,
    (row) => {
      const letter = letterWrite("detach", row);
      return {
        data: { ...data, ...letter.data },
        detachedLetter: letter.detachedLetter,
        letter: null,
      };
    },
    "supersede",
  );
}

export type ExitReportInput = MembershipExitFields & {
  kind: ExitReportKind;
  reportedById: string;
  /** A resignation's uploaded letter, already checked and copied; null for none. */
  letter: ResignationLetter | null;
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
  if (report.letter && report.kind !== "RESIGNATION") {
    throw new Error("Only a resignation report can carry a letter");
  }
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
      ...(report.letter ? letterColumns(report.letter) : CLEARED_LETTER_FIELDS),
    },
  });
  return count === 0 ? null : reportedAt;
}

/**
 * Rejects the pending report the Admin saw: clears the report, the four exit
 * fields and the letter, leaving the member ACTIVE. `row` is the read the
 * Admin's request was checked against; the write applies only while its
 * `exitReportedAt` still matches, so its letter is the one detached.
 */
export async function clearRejectedExitReport(
  tx: Prisma.TransactionClient,
  row: LetterColumns & { id: string },
  expectedExitReportedAt: Date,
): Promise<
  | { kind: "cleared"; detachedLetter: ResignationLetter | null }
  | { kind: "changed" }
> {
  const { count } = await tx.committeeMembership.updateMany({
    where: {
      id: row.id,
      status: ACTIVE_MEMBERSHIP_STATUS,
      exitReportedAt: expectedExitReportedAt,
    },
    data: {
      ...CLEARED_EXIT_REPORT_FIELDS,
      ...CLEARED_EXIT_FIELDS,
      ...CLEARED_LETTER_FIELDS,
    },
  });
  if (count === 0) return { kind: "changed" };
  return { kind: "cleared", detachedLetter: letterOnRow(row) };
}

/**
 * An Admin attaches or replaces the letter on a RESIGNED row (decision 12).
 * The exit fields are untouched. Applies only while the row is still RESIGNED
 * with the letter the caller read; false when it changed. A replaced object
 * stays in R2 (decision 15): record its key as `previousLetterKey`.
 */
export async function attachRecordedLetter(
  tx: Prisma.TransactionClient,
  row: LetterColumns & { id: string },
  letter: ResignationLetter,
): Promise<boolean> {
  const { count } = await tx.committeeMembership.updateMany({
    where: {
      id: row.id,
      status: "RESIGNED",
      resignationLetterKey: row.resignationLetterKey ?? null,
    },
    data: letterColumns(letter),
  });
  return count > 0;
}
