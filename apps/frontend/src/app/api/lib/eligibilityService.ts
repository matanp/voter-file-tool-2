/**
 * SRS §2.2 — Eligibility warning helpers (non-blocking).
 *
 * Primary spec: docs/SRS/SRS_IMPLEMENTATION_INACTIVE_VOTER_WARNING.md
 *
 * This module provides:
 * 1. **Most-recent-import version** — Used to derive "possibly inactive" voter warning
 *    from voter file import presence (not BOE status). Call getMostRecentImportVersion
 *    once per request and pass the result into warning derivation to avoid duplicate
 *    queries (see Implementation Notes in docs/SRS/tickets/2.2-warning-system.md).
 * 2. **Possibly-inactive check** — Compares a voter's latestRecordEntryYear/Number
 *    to the most recent import; if strictly older, the voter is flagged as possibly
 *    inactive (proxy for not appearing in latest BOE export).
 *
 * To change behavior later:
 * - Inactive logic: edit getMostRecentImportVersion (query) and isVoterPossiblyInactive
 *   (comparison). Assumptions (full snapshot export, version ordering) are in
 *   SRS_IMPLEMENTATION_INACTIVE_VOTER_WARNING.md §2.
 * - Resignation window: RECENT_RESIGNATION_DAYS is in eligibility.ts where warnings
 *   are built; move to config if needed.
 */

import type { PrismaClient } from "@prisma/client";

/** Version tuple from the most recent voter file import (max year, then max entry number). */
export type MostRecentImportVersion = {
  year: number;
  recordEntryNumber: number;
};

/**
 * Returns the (year, recordEntryNumber) of the most recent voter file import.
 * Used to detect "possibly inactive" voters whose record was not updated by the latest import.
 * Returns null when no VoterRecord exists (empty DB); in that case no inactive warning is added.
 *
 * Performance: Single indexed query. Call once per request and reuse the result for all
 * warning rules that need it (see ticket 2.2 Implementation Notes).
 */
export async function getMostRecentImportVersion(
  prisma: PrismaClient,
): Promise<MostRecentImportVersion | null> {
  const result = await prisma.voterRecord.findFirst({
    orderBy: [
      { latestRecordEntryYear: "desc" },
      { latestRecordEntryNumber: "desc" },
    ],
    select: { latestRecordEntryYear: true, latestRecordEntryNumber: true },
  });
  return result
    ? {
        year: result.latestRecordEntryYear,
        recordEntryNumber: result.latestRecordEntryNumber,
      }
    : null;
}

/**
 * Returns true if the voter's record version is strictly older than the most recent
 * import version (i.e. voter was not updated by the latest import — possibly inactive).
 * Comparison: (year, recordEntryNumber) is lexicographic: older year => inactive;
 * same year and lower recordEntryNumber => inactive.
 */
export function isVoterPossiblyInactive(
  voter: {
    latestRecordEntryYear: number;
    latestRecordEntryNumber: number;
  },
  mostRecent: MostRecentImportVersion,
): boolean {
  if (voter.latestRecordEntryYear < mostRecent.year) return true;
  if (
    voter.latestRecordEntryYear === mostRecent.year &&
    voter.latestRecordEntryNumber < mostRecent.recordEntryNumber
  )
    return true;
  return false;
}
