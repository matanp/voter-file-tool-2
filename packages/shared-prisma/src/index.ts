// Re-export all Prisma types and utilities
export type {
  // Enums
  JobStatus,
  PrivilegeLevel,
  ReportType,

  // Model types
  Account,
  Authenticator,
  CommitteeList,
  CommitteeRequest,
  CommitteeUploadDiscrepancy,
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

// Shared composite types
export type CommitteeListWithMembers =
  import('@prisma/client').CommitteeList & {
    committeeMemberList: import('@prisma/client').VoterRecord[];
  };

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
