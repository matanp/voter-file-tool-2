import type { CommitteeList, VoterRecord } from '@prisma/client';
import type { EnrichedPartialVoterRecordAPI } from '@voter-file-tool/shared-validators';
import {
  convertPrismaVoterRecordToAPI,
  applyCompoundFields,
} from '@voter-file-tool/shared-validators';
import { prisma } from './lib/prisma';

export type CommitteeWithMembers = CommitteeList & {
  committeeMemberList?: VoterRecord[];
};

export type CommitteeReportStructure = {
  cityTown: string;
  legDistrict: number;
  committees: Record<string, EnrichedPartialVoterRecordAPI[]>;
};

/**
 * Converts a voter record to a committee member with compound fields
 * @param voter - Database voter record
 * @returns Member data with compound name and address fields
 */
export const mapVoterRecordToMember = (
  voter: VoterRecord
): EnrichedPartialVoterRecordAPI => {
  // Convert Prisma record to API format first
  const apiRecord = convertPrismaVoterRecordToAPI(voter);
  // Apply compound fields (name and address)
  return applyCompoundFields(apiRecord);
};

/**
 * Transforms committee data into report structure
 * @param committees - Database committees with member lists
 * @returns Grouped committee data by location and election district
 */
export const mapCommitteesToReportShape = (
  committees: CommitteeWithMembers[]
): CommitteeReportStructure[] => {
  const groupMap = new Map<string, CommitteeReportStructure>();

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
          ([, members]) => members.length > 0
        )
      ),
    }))
    .filter((group) => Object.keys(group.committees).length > 0);
};

/**
 * Retrieves all committee data with member lists from the database
 * @returns Committee records with included member data
 */
export async function fetchCommitteeData(): Promise<CommitteeWithMembers[]> {
  try {
    const committees = await prisma.committeeList.findMany({
      include: {
        committeeMemberList: true,
      },
    });

    return committees;
  } catch (error) {
    console.error('Error fetching committee data:', error);
    if (error instanceof Error) {
      // Preserve the original stack trace by rethrowing the original error
      // with additional context in the message
      const enhancedError = new Error(
        `Failed to fetch committee data: ${error.message}`
      );
      enhancedError.stack = error.stack;
      throw enhancedError;
    }
    throw new Error('Failed to fetch committee data: Unknown error');
  }
}
