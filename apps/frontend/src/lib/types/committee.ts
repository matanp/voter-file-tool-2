import type { VoterRecord, CommitteeList } from "@prisma/client";
import type { CommitteeWithMembers } from "@voter-file-tool/shared-validators";
import {
  isVoterRecord,
  isCommitteeList,
} from "@voter-file-tool/shared-validators";

// Re-export generic API types for backward compatibility
export type {
  ApiResponse as StandardApiResponse,
  ApiErrorResponse,
} from "~/lib/validators/api";

// Committee member status for UI logic
export interface CommitteeMemberStatus {
  canAdd: boolean;
  reason?:
    | "already_member"
    | "different_committee"
    | "committee_full"
    | "valid";
  message: string;
}

// Committee selection state
export interface CommitteeSelection {
  city: string;
  legDistrict?: string;
  electionDistrict: number;
}

// Committee API request/response types
export interface CommitteeApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Specific response types for each endpoint
export interface AddCommitteeResponse
  extends CommitteeApiResponse<CommitteeWithMembers> {
  idempotent?: boolean;
}

export interface RemoveCommitteeResponse extends CommitteeApiResponse<void> {
  status?: "success" | "error";
}

export interface CommitteeRequestResponse extends CommitteeApiResponse<void> {
  // Request creation response
}

export interface HandleRequestResponse extends CommitteeApiResponse<void> {
  // Request handling response
}

export interface FetchCommitteeListResponse
  extends CommitteeApiResponse<CommitteeWithMembers> {
  // Committee list fetch response
}

// Committee validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Committee capacity information
export interface CapacityInfo {
  current: number;
  max: number;
  available: number;
  isFull: boolean;
}

// Committee member addition validation
export interface MemberAdditionValidation {
  canAdd: boolean;
  reason?: string;
  requiresApproval: boolean;
}

// Type guards for runtime validation
export function isCommitteeWithMembers(
  data: unknown,
): data is CommitteeWithMembers {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "cityTown" in data &&
    "electionDistrict" in data &&
    "committeeMemberList" in data &&
    Array.isArray((data as any).committeeMemberList)
  );
}

// Re-export type guards from shared-validators for convenience
export { isVoterRecord, isCommitteeList };
