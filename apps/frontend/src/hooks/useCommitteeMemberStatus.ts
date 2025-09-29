import { type VoterRecordAPI } from "@voter-file-tool/shared-validators";
import type { CommitteeMemberStatus } from "~/lib/types/committee";
import {
  COMMITTEE_CONSTANTS,
  COMMITTEE_MESSAGES,
} from "~/lib/constants/committee";

/**
 * Hook for determining committee member status and validation
 * Consolidates member status logic used across multiple components
 */
export function useCommitteeMemberStatus(
  record: VoterRecordAPI,
  committeeList: VoterRecordAPI[],
): CommitteeMemberStatus {
  const member = committeeList.find((m) => m.VRCNUM === record.VRCNUM);

  if (member) {
    return {
      canAdd: false,
      reason: "already_member",
      message: COMMITTEE_MESSAGES.ALREADY_MEMBER,
    };
  }

  if (record.committeeId) {
    return {
      canAdd: false,
      reason: "different_committee",
      message: COMMITTEE_MESSAGES.DIFFERENT_COMMITTEE,
    };
  }

  if (committeeList.length >= COMMITTEE_CONSTANTS.MAX_MEMBERS) {
    return {
      canAdd: false,
      reason: "committee_full",
      message: COMMITTEE_MESSAGES.COMMITTEE_FULL,
    };
  }

  return {
    canAdd: true,
    reason: "valid",
    message: COMMITTEE_MESSAGES.ADD_TO_COMMITTEE,
  };
}
