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

// Re-export Prisma namespace for input types, where clauses, and runtime
// utilities (e.g. `new Prisma.Decimal(...)`). Value export so both the type
// and the runtime namespace are available to consumers.
export { Prisma } from '@prisma/client';

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

export {
  normalizeEligibilityText,
  isPartyMismatch,
  isAssemblyDistrictMismatch,
} from './eligibilityPredicates';

export {
  computeDesignationWeight,
  indexActiveMembershipsBySeat,
  type ComputeDesignationWeightInput,
  type DesignationMembershipInput,
  type DesignationSeatInput,
  type DesignationWeightContext,
  type DesignationWeightResult,
  type OccupantMembershipType,
  type SeatContribution,
} from './committeeDesignationWeight';
