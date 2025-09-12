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
  const baseMember = mapVoterRecordToMember(voter);

  const member: CommitteeMemberWithFields = {
    ...baseMember,
  };

  for (const field of includeFields) {
    const value = baseMember[field];

    // Always add the field, even if null/undefined, so it appears in XLSX
    if (value !== null && value !== undefined) {
      (member as Record<string, unknown>)[field] = value;
    } else {
      (member as Record<string, unknown>)[field] = "";
    }
  }

  return member;
};

type LDCommitteesWithCompoundFields = {
  cityTown: string;
  legDistrict: number;
  committees: Record<string, CompoundFieldTarget[]>;
};

export type LDCommitteesWithFields = {
  cityTown: string;
  legDistrict: number;
  committees: Record<string, CommitteeMemberWithFields[]>;
};
export const mapCommiteesToReportShape = (
  committees: CommitteeWithMembers[],
): LDCommitteesWithCompoundFields[] => {
  const groupMap = new Map<string, LDCommitteesWithCompoundFields>();

  for (const committee of committees) {
    const groupKey = `${committee.cityTown}|${committee.legDistrict}`;

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

    const electionDistrictKey = String(committee.electionDistrict);

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

export const mapCommitteesToReportShapeWithFields = (
  committees: CommitteeWithMembers[],
  includeFields: VoterRecordField[],
): LDCommitteesWithFields[] => {
  const groupMap = new Map<string, LDCommitteesWithFields>();

  for (const committee of committees) {
    const groupKey = `${committee.cityTown}|${committee.legDistrict}`;

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

    const electionDistrictKey = String(committee.electionDistrict);

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
