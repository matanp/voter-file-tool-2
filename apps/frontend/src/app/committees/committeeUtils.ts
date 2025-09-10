import type { CommitteeList, VoterRecord } from "@prisma/client";
import type {
  CommitteeMember,
  LDCommittees,
  AllowedVoterRecordFields,
} from "@voter-file-tool/shared-validators";

const mapVoterRecordToMember = (
  voter: VoterRecord,
  allowedFields?: AllowedVoterRecordFields[],
): CommitteeMember => {
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

  const baseMember: CommitteeMember = {
    name,
    address: addressParts,
    city: voter.city ?? "",
    state: voter.state ?? "",
    zip: voter.zipCode ?? "",
    phone: voter.telephone ?? "",
    // Always include electionDistrict for grouping purposes
    electionDistrict: voter.electionDistrict ?? null,
  };

  if (allowedFields && allowedFields.length > 0) {
    const additionalFields: Record<string, any> = {};

    for (const field of allowedFields) {
      const value = voter[field as keyof VoterRecord];
      if (value !== null && value !== undefined) {
        if (field === "DOB" && value instanceof Date) {
          additionalFields[field] = value.toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
        } else {
          additionalFields[field] = value;
        }
      }
    }

    return { ...baseMember, ...additionalFields };
  }

  return baseMember;
};

export type CommitteeWithMembers = CommitteeList & {
  committeeMemberList?: VoterRecord[];
};

export const mapCommiteesToReportShape = (
  committees: CommitteeWithMembers[],
  allowedFields?: AllowedVoterRecordFields[],
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
        allowedFields,
      };
      groupMap.set(groupKey, group);
    }

    const members =
      committee.committeeMemberList?.map((voter) =>
        mapVoterRecordToMember(voter, allowedFields),
      ) ?? [];

    // Group members by their election district
    const membersByElectionDistrict = new Map<number, typeof members>();

    for (const member of members) {
      const electionDistrict = member.electionDistrict;
      if (
        electionDistrict !== null &&
        electionDistrict !== undefined &&
        typeof electionDistrict === "number"
      ) {
        if (!membersByElectionDistrict.has(electionDistrict)) {
          membersByElectionDistrict.set(electionDistrict, []);
        }
        membersByElectionDistrict.get(electionDistrict)!.push(member);
      }
    }

    // Add members to their respective election districts
    for (const [
      electionDistrict,
      districtMembers,
    ] of membersByElectionDistrict) {
      const electionDistrictKey = electionDistrict.toString();

      if (group && !group.committees[electionDistrictKey]) {
        group.committees[electionDistrictKey] = [];
      }
      if (group) {
        group.committees[electionDistrictKey]?.push(...districtMembers);
      }
    }
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
