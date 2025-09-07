import type { CommitteeList, VoterRecord } from "@prisma/client";
import type {
  CommitteeMember,
  LDCommittees,
} from "~/lib/validators/ldCommittees";

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
    .join(" "); // address formatting???

  return {
    name,
    address: addressParts,
    city: voter.city ?? "",
    state: voter.state ?? "",
    zip: voter.zipCode ?? "",
    phone: voter.telephone ?? "",
  };
};

export type CommitteeWithMembers = CommitteeList & {
  committeeMemberList: VoterRecord[];
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

    const members = committee.committeeMemberList.map(mapVoterRecordToMember);

    // Create stable election district key, sanitizing externalId
    const electionDistrictKey = String(committee.externalId ?? committee.id);
    
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
