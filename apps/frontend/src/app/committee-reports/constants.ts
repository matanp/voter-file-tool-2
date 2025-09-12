import type { VoterRecordField } from "@voter-file-tool/shared-validators";

// Available VoterRecord fields for selection
export const AVAILABLE_FIELDS: {
  key: VoterRecordField;
  label: string;
  category: string;
}[] = [
  // Basic identification fields
  {
    key: "VRCNUM",
    label: "Voter Registration Number",
    category: "Identification",
  },
  { key: "firstName", label: "First Name", category: "Identification" },
  { key: "middleInitial", label: "Middle Initial", category: "Identification" },
  { key: "lastName", label: "Last Name", category: "Identification" },
  { key: "suffixName", label: "Suffix Name", category: "Identification" },
  { key: "DOB", label: "Date of Birth", category: "Identification" },
  { key: "gender", label: "Gender", category: "Identification" },

  // Address fields
  { key: "houseNum", label: "House Number", category: "Address" },
  { key: "street", label: "Street", category: "Address" },
  { key: "apartment", label: "Apartment", category: "Address" },
  { key: "halfAddress", label: "Half Address", category: "Address" },
  {
    key: "resAddrLine2",
    label: "Residence Address Line 2",
    category: "Address",
  },
  {
    key: "resAddrLine3",
    label: "Residence Address Line 3",
    category: "Address",
  },
  { key: "city", label: "City", category: "Address" },
  { key: "state", label: "State", category: "Address" },
  { key: "zipCode", label: "ZIP Code", category: "Address" },
  { key: "zipSuffix", label: "ZIP Suffix", category: "Address" },

  // Contact information
  { key: "telephone", label: "Telephone", category: "Contact" },
  { key: "email", label: "Email", category: "Contact" },

  // Mailing address
  {
    key: "mailingAddress1",
    label: "Mailing Address 1",
    category: "Mailing Address",
  },
  {
    key: "mailingAddress2",
    label: "Mailing Address 2",
    category: "Mailing Address",
  },
  {
    key: "mailingAddress3",
    label: "Mailing Address 3",
    category: "Mailing Address",
  },
  {
    key: "mailingAddress4",
    label: "Mailing Address 4",
    category: "Mailing Address",
  },
  { key: "mailingCity", label: "Mailing City", category: "Mailing Address" },
  { key: "mailingState", label: "Mailing State", category: "Mailing Address" },
  { key: "mailingZip", label: "Mailing ZIP", category: "Mailing Address" },
  {
    key: "mailingZipSuffix",
    label: "Mailing ZIP Suffix",
    category: "Mailing Address",
  },

  // Political information
  { key: "party", label: "Party", category: "Political" },
  { key: "L_T", label: "L_T", category: "Political" },

  // District information
  {
    key: "electionDistrict",
    label: "Election District",
    category: "Districts",
  },
  {
    key: "countyLegDistrict",
    label: "County Legislative District",
    category: "Districts",
  },
  {
    key: "stateAssmblyDistrict",
    label: "State Assembly District",
    category: "Districts",
  },
  {
    key: "stateSenateDistrict",
    label: "State Senate District",
    category: "Districts",
  },
  {
    key: "congressionalDistrict",
    label: "Congressional District",
    category: "Districts",
  },
  { key: "CC_WD_Village", label: "CC_WD_Village", category: "Districts" },
  { key: "townCode", label: "Town Code", category: "Districts" },

  // Other fields
  {
    key: "originalRegDate",
    label: "Original Registration Date",
    category: "Other",
  },
  { key: "statevid", label: "State VID", category: "Other" },
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
