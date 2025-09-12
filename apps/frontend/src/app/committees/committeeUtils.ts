import type { CommitteeList, VoterRecord } from "@prisma/client";
import type {
  VoterRecordField,
  CompoundFieldTarget,
} from "@voter-file-tool/shared-validators";
import {
  applyCompoundFields,
  convertPrismaVoterRecordToAPI,
} from "@voter-file-tool/shared-validators";

const mapVoterRecordToMember = (voter: VoterRecord): CompoundFieldTarget => {
  // Convert Prisma record to API format first
  const apiRecord = convertPrismaVoterRecordToAPI(voter);

  // Apply compound fields (name and address)
  return applyCompoundFields(apiRecord);
};

export type CommitteeWithMembers = CommitteeList & {
  committeeMemberList?: VoterRecord[];
};

// Interface for committee members with additional fields
type CommitteeMemberWithFields = CompoundFieldTarget & Record<string, unknown>;

const mapVoterRecordToMemberWithFields = (
  voter: VoterRecord,
  includeFields: VoterRecordField[],
): CommitteeMemberWithFields => {
  // Start with basic member mapping (includes compound fields)
  const baseMember = mapVoterRecordToMember(voter);

  // const apiRecord = convertPrismaVoterRecordToAPI(voter);

  // Create the result object with proper typing
  const member: CommitteeMemberWithFields = {
    ...baseMember,
  };

  // Add selected fields dynamically
  for (const field of includeFields) {
    const value = baseMember[field];

    // Always add the field, even if null/undefined, so it appears in XLSX
    if (value !== null && value !== undefined) {
      (member as Record<string, unknown>)[field] = value;
    } else {
      // Add field with empty value so it appears in XLSX
      (member as Record<string, unknown>)[field] = "";
    }
  }

  return member;
};

// Extended LDCommittees type that includes compound fields
type LDCommitteesWithCompoundFields = {
  cityTown: string;
  legDistrict: number;
  committees: Record<string, CompoundFieldTarget[]>;
};

export const mapCommiteesToReportShape = (
  committees: CommitteeWithMembers[],
): LDCommitteesWithCompoundFields[] => {
  // Create a Map keyed by group identifier (cityTown + legDistrict) for O(1) lookup
  const groupMap = new Map<string, LDCommitteesWithCompoundFields>();

  for (const committee of committees) {
    // Create stable group key from cityTown + legDistrict
    const groupKey = `${committee.cityTown}|${committee.legDistrict}`;

    // Get or create group
    let group = groupMap.get(groupKey);
    if (!group) {
      group = {
        cityTown: committee.cityTown,
        legDistrict: committee.legDistrict,
        committees: {},
      };
      groupMap.set(groupKey, group);
    }

    const members =
      committee.committeeMemberList?.map(mapVoterRecordToMember) ?? [];

    // Create stable election district key using the actual election district
    const electionDistrictKey = String(committee.electionDistrict);

    // Initialize election district array if it doesn't exist
    if (!group.committees[electionDistrictKey]) {
      group.committees[electionDistrictKey] = [];
    }
    group.committees[electionDistrictKey]?.push(...members);
  }

  // Convert Map values to array and cleanup: drop empty EDs and then drop groups with no EDs
  return Array.from(groupMap.values())
    .map((group) => ({
      ...group,
      committees: Object.fromEntries(
        Object.entries(group.committees).filter(
          ([, members]) => members.length > 0,
        ),
      ),
    }))
    .filter((group) => Object.keys(group.committees).length > 0);
};

// New function for XLSX configuration with dynamic field selection
export const mapCommitteesToReportShapeWithFields = (
  committees: CommitteeWithMembers[],
  includeFields: VoterRecordField[],
): LDCommitteesWithCompoundFields[] => {
  // Create a Map keyed by group identifier (cityTown + legDistrict) for O(1) lookup
  const groupMap = new Map<string, LDCommitteesWithCompoundFields>();

  for (const committee of committees) {
    // Create stable group key from cityTown + legDistrict
    const groupKey = `${committee.cityTown}|${committee.legDistrict}`;

    // Get or create group
    let group = groupMap.get(groupKey);
    if (!group) {
      group = {
        cityTown: committee.cityTown,
        legDistrict: committee.legDistrict,
        committees: {},
      };
      groupMap.set(groupKey, group);
    }

    const members =
      committee.committeeMemberList?.map((voter) =>
        mapVoterRecordToMemberWithFields(voter, includeFields),
      ) ?? [];

    // Create stable election district key using the actual election district
    const electionDistrictKey = String(committee.electionDistrict);

    // Initialize election district array if it doesn't exist
    if (!group.committees[electionDistrictKey]) {
      group.committees[electionDistrictKey] = [];
    }
    group.committees[electionDistrictKey]?.push(...members);
  }

  // Convert Map values to array and cleanup: drop empty EDs and then drop groups with no EDs
  return Array.from(groupMap.values())
    .map((group) => ({
      ...group,
      committees: Object.fromEntries(
        Object.entries(group.committees).filter(
          ([, members]) => members.length > 0,
        ),
      ),
    }))
    .filter((group) => Object.keys(group.committees).length > 0);
};
