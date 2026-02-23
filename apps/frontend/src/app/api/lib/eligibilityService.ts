/**
 * SRS §2.2 — Eligibility warning helpers (non-blocking).
 *
 * This module re-exports shared helpers from @voter-file-tool/shared-prisma so
 * eligibility warning derivation (2.2) and BOE flagging (2.8) stay aligned.
 */

export {
  getMostRecentImportVersion,
  isVoterPossiblyInactive,
  type MostRecentImportVersion,
} from "@voter-file-tool/shared-prisma";
