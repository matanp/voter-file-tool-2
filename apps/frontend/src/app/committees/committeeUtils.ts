import type { CommitteeList, VoterRecord } from "@prisma/client";
import type {
  CommitteeMember,
  LDCommittees,
  AllowedVoterRecordFields,
  CompoundType,
  CompoundTypeSelection,
} from "@voter-file-tool/shared-validators";
import {
  getCompoundTypeFields,
  getFieldCompoundType,
  flattenCompoundType,
} from "@voter-file-tool/shared-validators";

// Helper function to determine which fields to include based on compound types and individual fields
const determineFieldsToInclude = (
  allowedFields?: AllowedVoterRecordFields[],
  compoundTypes?: CompoundTypeSelection,
): {
  individualFields: AllowedVoterRecordFields[];
  compoundFields: Partial<Record<CompoundType, AllowedVoterRecordFields[]>>;
} => {
  const individualFields: AllowedVoterRecordFields[] = [];
  const compoundFields: Partial<
    Record<CompoundType, AllowedVoterRecordFields[]>
  > = {
    address: [],
    mailingAddress: [],
    name: [],
    contact: [],
    districts: [],
  };

  if (!allowedFields) {
    return { individualFields, compoundFields };
  }

  for (const field of allowedFields) {
    const compoundType = getFieldCompoundType(field);
    if (compoundType) {
      if (!compoundFields[compoundType]) {
        compoundFields[compoundType] = [];
      }
      compoundFields[compoundType]!.push(field);
    } else {
      individualFields.push(field);
    }
  }

  // If compound types are specified, include all fields for those types
  // This will override any individual field selections for those compound types
  if (compoundTypes) {
    for (const compoundType of compoundTypes) {
      const allFieldsForType = getCompoundTypeFields(
        compoundType,
      ) as AllowedVoterRecordFields[];
      compoundFields[compoundType] = allFieldsForType;
    }
  }

  return { individualFields, compoundFields };
};

const mapVoterRecordToMember = (
  voter: VoterRecord,
  allowedFields?: AllowedVoterRecordFields[],
  compoundTypes?: CompoundTypeSelection,
): CommitteeMember => {
  // Start with electionDistrict as the base field
  const member: Record<string, any> = {
    electionDistrict: voter.electionDistrict ?? null,
  };

  const { individualFields, compoundFields } = determineFieldsToInclude(
    allowedFields,
    compoundTypes,
  );

  // Add individual fields
  for (const field of individualFields) {
    const value = voter[field as keyof VoterRecord];
    if (value !== null && value !== undefined) {
      if (field === "DOB" && value instanceof Date) {
        member[field] = value.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      } else {
        member[field] = value;
      }
    }
  }

  // Add compound type fields - either flattened or individual
  for (const [compoundType, fields] of Object.entries(compoundFields)) {
    if (fields.length > 0) {
      // Check if this compound type is selected as a whole
      const isCompoundTypeSelected = compoundTypes?.includes(
        compoundType as CompoundType,
      );

      if (isCompoundTypeSelected) {
        // Flatten the compound type into a single string
        const flattenedValue = flattenCompoundType(
          compoundType as CompoundType,
          voter,
        );
        member[compoundType] = flattenedValue;
      } else {
        // Add individual fields from this compound type
        for (const field of fields) {
          const value = voter[field as keyof VoterRecord];
          if (value !== null && value !== undefined) {
            if (
              (field === "DOB" || field === "originalRegDate") &&
              value instanceof Date
            ) {
              member[field] = value.toLocaleDateString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              });
            } else {
              member[field] = value;
            }
          }
        }
      }
    }
  }

  return member as CommitteeMember;
};

export type CommitteeWithMembers = CommitteeList & {
  committeeMemberList?: VoterRecord[];
};

export const mapCommiteesToReportShape = (
  committees: CommitteeWithMembers[],
  allowedFields?: AllowedVoterRecordFields[],
  compoundTypes?: CompoundTypeSelection,
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
        ...(compoundTypes && { compoundTypes }),
      };
      groupMap.set(groupKey, group);
    }

    const members =
      committee.committeeMemberList?.map((voter) =>
        mapVoterRecordToMember(voter, allowedFields, compoundTypes),
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
