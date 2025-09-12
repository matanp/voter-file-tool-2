import type { CommitteeList, VoterRecord } from "@prisma/client";
import type {
  CommitteeMember,
  LDCommittees,
  VoterRecordField,
} from "@voter-file-tool/shared-validators";
import { mapVoterRecordToMemberWithFields as mapVoterRecordToMemberWithFieldsShared } from "@voter-file-tool/shared-validators";

const mapVoterRecordToMember = (voter: VoterRecord): CommitteeMember => {
  const name = [
    voter.firstName,
    voter.middleInitial,
    voter.lastName,
    voter.suffixName,
  ]
    .filter(Boolean)
    .join(" ");

  const addressParts = [
    voter.houseNum ? voter.houseNum.toString() : null,
    voter.street,
    voter.apartment ? `APT ${voter.apartment}` : null,
    voter.resAddrLine2,
    voter.resAddrLine3,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    name,
    address: addressParts,
  };
};

export type CommitteeWithMembers = CommitteeList & {
  committeeMemberList?: VoterRecord[];
};

// Use shared utility function for mapping voter records to members with fields
// The shared function handles compound fields and basic field mapping
// We'll extend it here to handle date fields specifically for this use case
const mapVoterRecordToMemberWithFields = (
  voter: VoterRecord,
  includeFields: VoterRecordField[],
): CommitteeMember & Record<string, unknown> => {
  // Use shared utility for basic mapping
  const member = mapVoterRecordToMemberWithFieldsShared(voter, includeFields, {
    name: true,
    address: true,
  });

  // Add selected fields dynamically with date handling
  for (const field of includeFields) {
    const value = voter[field];

    // Always add the field, even if null/undefined, so it appears in XLSX
    if (value !== null && value !== undefined) {
      // Handle date fields
      if (field === "DOB" || field === "originalRegDate") {
        member[field] = value instanceof Date ? value : new Date(value);
      } else {
        member[field] = value;
      }
    } else {
      // Add field with empty value so it appears in XLSX
      member[field] = "";
    }
  }
  return member;
};

export const mapCommiteesToReportShape = (
  committees: CommitteeWithMembers[],
): LDCommittees[] => {
  // Create a Map keyed by group identifier (cityTown + legDistrict) for O(1) lookup
  const groupMap = new Map<string, LDCommittees>();

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
): LDCommittees[] => {
  // Create a Map keyed by group identifier (cityTown + legDistrict) for O(1) lookup
  const groupMap = new Map<string, LDCommittees>();

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
