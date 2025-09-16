import type { VoterRecordField } from "@voter-file-tool/shared-validators";
import { searchableFieldEnum } from "@voter-file-tool/shared-validators";

// Available VoterRecord fields for selection
export const AVAILABLE_FIELDS: {
  key: VoterRecordField;
  label: string;
  category: string;
}[] = [
  // Basic identification fields
  {
    key: searchableFieldEnum.enum.VRCNUM,
    label: "Voter Registration Number",
    category: "Identification",
  },
  {
    key: searchableFieldEnum.enum.firstName,
    label: "First Name",
    category: "Identification",
  },
  {
    key: searchableFieldEnum.enum.middleInitial,
    label: "Middle Initial",
    category: "Identification",
  },
  {
    key: searchableFieldEnum.enum.lastName,
    label: "Last Name",
    category: "Identification",
  },
  {
    key: searchableFieldEnum.enum.suffixName,
    label: "Suffix Name",
    category: "Identification",
  },
  {
    key: searchableFieldEnum.enum.DOB,
    label: "Date of Birth",
    category: "Identification",
  },
  {
    key: searchableFieldEnum.enum.gender,
    label: "Gender",
    category: "Identification",
  },

  // Address fields
  {
    key: searchableFieldEnum.enum.houseNum,
    label: "House Number",
    category: "Address",
  },
  {
    key: searchableFieldEnum.enum.street,
    label: "Street",
    category: "Address",
  },
  {
    key: searchableFieldEnum.enum.apartment,
    label: "Apartment",
    category: "Address",
  },
  {
    key: searchableFieldEnum.enum.halfAddress,
    label: "Half Address",
    category: "Address",
  },
  {
    key: searchableFieldEnum.enum.resAddrLine2,
    label: "Residence Address Line 2",
    category: "Address",
  },
  {
    key: searchableFieldEnum.enum.resAddrLine3,
    label: "Residence Address Line 3",
    category: "Address",
  },
  { key: searchableFieldEnum.enum.city, label: "City", category: "Address" },
  { key: searchableFieldEnum.enum.state, label: "State", category: "Address" },
  {
    key: searchableFieldEnum.enum.zipCode,
    label: "ZIP Code",
    category: "Address",
  },
  {
    key: searchableFieldEnum.enum.zipSuffix,
    label: "ZIP Suffix",
    category: "Address",
  },

  // Contact information
  {
    key: searchableFieldEnum.enum.telephone,
    label: "Telephone",
    category: "Contact",
  },
  { key: searchableFieldEnum.enum.email, label: "Email", category: "Contact" },

  // Mailing address
  {
    key: searchableFieldEnum.enum.mailingAddress1,
    label: "Mailing Address 1",
    category: "Mailing Address",
  },
  {
    key: searchableFieldEnum.enum.mailingAddress2,
    label: "Mailing Address 2",
    category: "Mailing Address",
  },
  {
    key: searchableFieldEnum.enum.mailingAddress3,
    label: "Mailing Address 3",
    category: "Mailing Address",
  },
  {
    key: searchableFieldEnum.enum.mailingAddress4,
    label: "Mailing Address 4",
    category: "Mailing Address",
  },
  {
    key: searchableFieldEnum.enum.mailingCity,
    label: "Mailing City",
    category: "Mailing Address",
  },
  {
    key: searchableFieldEnum.enum.mailingState,
    label: "Mailing State",
    category: "Mailing Address",
  },
  {
    key: searchableFieldEnum.enum.mailingZip,
    label: "Mailing ZIP",
    category: "Mailing Address",
  },
  {
    key: searchableFieldEnum.enum.mailingZipSuffix,
    label: "Mailing ZIP Suffix",
    category: "Mailing Address",
  },

  // Political information
  {
    key: searchableFieldEnum.enum.party,
    label: "Party",
    category: "Political",
  },
  { key: searchableFieldEnum.enum.L_T, label: "L_T", category: "Political" },

  // District information
  {
    key: searchableFieldEnum.enum.electionDistrict,
    label: "Election District",
    category: "Districts",
  },
  {
    key: searchableFieldEnum.enum.countyLegDistrict,
    label: "County Legislative District",
    category: "Districts",
  },
  {
    key: searchableFieldEnum.enum.stateAssmblyDistrict,
    label: "State Assembly District",
    category: "Districts",
  },
  {
    key: searchableFieldEnum.enum.stateSenateDistrict,
    label: "State Senate District",
    category: "Districts",
  },
  {
    key: searchableFieldEnum.enum.congressionalDistrict,
    label: "Congressional District",
    category: "Districts",
  },
  {
    key: searchableFieldEnum.enum.CC_WD_Village,
    label: "CC_WD_Village",
    category: "Districts",
  },
  {
    key: searchableFieldEnum.enum.townCode,
    label: "Town Code",
    category: "Districts",
  },

  // Other fields
  {
    key: searchableFieldEnum.enum.originalRegDate,
    label: "Original Registration Date",
    category: "Other",
  },
  {
    key: searchableFieldEnum.enum.statevid,
    label: "State VID",
    category: "Other",
  },
  {
    key: "addressForCommittee",
    label: "Address for Committee",
    category: "Other",
  },
];

// Group fields by category
export const FIELDS_BY_CATEGORY = AVAILABLE_FIELDS.reduce<
  Record<string, (typeof AVAILABLE_FIELDS)[number][]>
>((acc, field) => {
  (acc[field.category] ||= []).push(field);
  return acc;
}, {});

export const FIELDS_BY_KEY = AVAILABLE_FIELDS.reduce(
  (acc, field) => {
    acc[field.key] = field;
    return acc;
  },
  {} as Record<string, (typeof AVAILABLE_FIELDS)[0]>,
);
