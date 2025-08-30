import { CommitteeList, VoterRecord } from "@prisma/client";
import { LDCommittees } from "~/lib/validators/ldCommittee";

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
    voter.apartment ? `Apt ${voter.apartment}` : null,
    voter.halfAddress,
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

export const mapCommiteesToReportShape = (
  committees: CommitteeList[],
): LDCommittees[] => {
  const result: LDCommittees[] = [];

  for (const committee of committees) {
    // find existing group (cityTown + legDistrict)
    let group = result.find(
      (g) =>
        g.cityTown === committee.cityTown &&
        g.legDistrict === committee.legDistrict,
    );

    if (!group) {
      group = {
        cityTown: committee.cityTown,
        legDistrict: committee.legDistrict,
        committees: {},
      };
      result.push(group);
    }

    const members = committee.committeeMemberList.map(mapVoterRecordToMember);

    // assign to electionDistrict key
    if (!group.committees[committee.electionDistrict]) {
      group.committees[committee.electionDistrict] = [];
    }
    group.committees[committee.electionDistrict].push(...members);
  }

  // cleanup: drop empty EDs and then drop groups with no EDs
  return result
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
