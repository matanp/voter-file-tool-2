// Re-export all Prisma types and utilities
export type {
  // Enums
  EligibilityFlagReason,
  EligibilityFlagStatus,
  JobStatus,
  PrivilegeLevel,
  ReportType,

  // Model types
  Account,
  Authenticator,
  CommitteeList,
  CommitteeMembership,
  CommitteeRequest,
  CommitteeUploadDiscrepancy,
  EligibilityFlag,
  DropdownLists,
  ElectionDate,
  Invite,
  OfficeName,
  PrivilegedUser,
  Report,
  Session,
  User,
  VerificationToken,
  VoterRecord,
  VoterRecordArchive,
  VotingHistoryRecord,
} from '@prisma/client';

// Re-export PrismaClient class
export { PrismaClient } from '@prisma/client';

// Re-export Prisma namespace for all input types, where clauses, etc.
export type { Prisma } from '@prisma/client';

// Re-export common Prisma utilities
export {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
} from '@prisma/client/runtime/library';

export {
  getMostRecentImportVersion,
  isVoterPossiblyInactive,
  runBoeEligibilityFlagging,
  type MostRecentImportVersion,
  type BoeEligibilityFlaggingRunInput,
  type BoeEligibilityFlaggingRunResult,
} from './boeEligibilityFlagging';
