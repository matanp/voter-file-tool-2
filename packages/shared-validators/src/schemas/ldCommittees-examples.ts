/**
 * Examples demonstrating how to use the enhanced ldCommittees schemas
 * with dynamic VoterRecord field inclusion
 */

import {
  createCommitteeMemberSchema,
  createLDCommitteesSchema,
  createLDCommitteesArraySchema,
  voterRecordFieldSchemas,
  type VoterRecordField,
} from './ldCommittees';

import {
  createLDCommitteesReportSchema,
  createGenerateReportSchema,
  type DynamicGenerateReportData,
  type DynamicLDCommitteesReportData,
} from './report';

// Example 1: Basic usage with default fields (backward compatible)
export const basicCommitteeMemberSchema = createCommitteeMemberSchema();
export const basicLDCommitteesSchema = createLDCommitteesSchema();
export const basicLDCommitteesArraySchema = createLDCommitteesArraySchema();

// Example 2: Include specific VoterRecord fields for committee members
export const committeeMemberWithContactInfoSchema = createCommitteeMemberSchema(
  ['VRCNUM', 'email', 'telephone', 'party']
);

// Example 3: Include address and district information
export const committeeMemberWithAddressSchema = createCommitteeMemberSchema([
  'VRCNUM',
  'houseNum',
  'street',
  'apartment',
  'zipCode',
  'electionDistrict',
  'countyLegDistrict',
  'stateAssmblyDistrict',
  'stateSenateDistrict',
  'congressionalDistrict',
]);

// Example 4: Include comprehensive voter information
export const committeeMemberWithFullInfoSchema = createCommitteeMemberSchema([
  'VRCNUM',
  'lastName',
  'firstName',
  'middleInitial',
  'suffixName',
  'email',
  'telephone',
  'party',
  'gender',
  'DOB',
  'electionDistrict',
  'countyLegDistrict',
  'stateAssmblyDistrict',
  'stateSenateDistrict',
  'congressionalDistrict',
  'originalRegDate',
]);

// Example 5: Create LDCommittees schemas with different field sets
export const ldCommitteesWithContactInfoSchema = createLDCommitteesSchema([
  'VRCNUM',
  'email',
  'telephone',
  'party',
]);

export const ldCommitteesWithAddressSchema = createLDCommitteesSchema([
  'VRCNUM',
  'houseNum',
  'street',
  'apartment',
  'zipCode',
  'electionDistrict',
  'countyLegDistrict',
]);

// Example 6: Array schemas with specific fields
export const ldCommitteesArrayWithContactInfoSchema =
  createLDCommitteesArraySchema(['VRCNUM', 'email', 'telephone', 'party']);

// Example 7: Utility function to create schema with commonly used field combinations
export const createCommonFieldCombinations = () => ({
  // Minimal voter info
  minimal: ['VRCNUM', 'email', 'telephone'] as VoterRecordField[],

  // Contact and basic info
  contact: [
    'VRCNUM',
    'email',
    'telephone',
    'party',
    'gender',
  ] as VoterRecordField[],

  // Address information
  address: [
    'VRCNUM',
    'houseNum',
    'street',
    'apartment',
    'zipCode',
    'city',
    'state',
  ] as VoterRecordField[],

  // District information
  districts: [
    'VRCNUM',
    'electionDistrict',
    'countyLegDistrict',
    'stateAssmblyDistrict',
    'stateSenateDistrict',
    'congressionalDistrict',
  ] as VoterRecordField[],

  // Full voter record (excluding sensitive fields)
  comprehensive: [
    'VRCNUM',
    'lastName',
    'firstName',
    'middleInitial',
    'suffixName',
    'email',
    'telephone',
    'party',
    'gender',
    'DOB',
    'houseNum',
    'street',
    'apartment',
    'zipCode',
    'electionDistrict',
    'countyLegDistrict',
    'stateAssmblyDistrict',
    'stateSenateDistrict',
    'congressionalDistrict',
    'originalRegDate',
  ] as VoterRecordField[],
});

// Example 8: Type-safe field selection
export const createSchemaWithTypeSafeFields = <T extends VoterRecordField[]>(
  fields: T
) => {
  return {
    committeeMember: createCommitteeMemberSchema(fields),
    ldCommittees: createLDCommitteesSchema(fields),
    ldCommitteesArray: createLDCommitteesArraySchema(fields),
  };
};

// Example 9: Runtime validation of field names
export const validateFieldNames = (
  fields: string[]
): fields is VoterRecordField[] => {
  const validFields = Object.keys(
    voterRecordFieldSchemas
  ) as VoterRecordField[];
  return fields.every((field) =>
    validFields.includes(field as VoterRecordField)
  );
};

// Example 10: Report schema with dynamic fields
export const reportWithContactInfoSchema = createLDCommitteesReportSchema([
  'VRCNUM',
  'email',
  'telephone',
  'party',
]);

export const reportWithAddressSchema = createLDCommitteesReportSchema([
  'VRCNUM',
  'houseNum',
  'street',
  'apartment',
  'zipCode',
  'electionDistrict',
  'countyLegDistrict',
]);

// Example 11: Complete generate report schema with dynamic fields
export const generateReportWithFieldsSchema = createGenerateReportSchema([
  'VRCNUM',
  'email',
  'telephone',
  'party',
  'electionDistrict',
]);

// Example 12: Type-safe report data creation
export const createReportData = (
  fields: VoterRecordField[],
  committeeData: any
): DynamicLDCommitteesReportData => {
  return {
    type: 'ldCommittees',
    payload: committeeData,
    format: 'pdf',
    includeFields: fields,
  };
};

// Example 13: Get available field names for UI selection
export const getAvailableFieldNames = (): {
  key: VoterRecordField;
  label: string;
  category: string;
}[] => {
  return [
    // Basic identification
    {
      key: 'VRCNUM',
      label: 'Voter Registration Number',
      category: 'Identification',
    },
    { key: 'lastName', label: 'Last Name', category: 'Identification' },
    { key: 'firstName', label: 'First Name', category: 'Identification' },
    {
      key: 'middleInitial',
      label: 'Middle Initial',
      category: 'Identification',
    },
    { key: 'suffixName', label: 'Suffix Name', category: 'Identification' },

    // Address
    { key: 'houseNum', label: 'House Number', category: 'Address' },
    { key: 'street', label: 'Street', category: 'Address' },
    { key: 'apartment', label: 'Apartment', category: 'Address' },
    { key: 'halfAddress', label: 'Half Address', category: 'Address' },
    { key: 'resAddrLine2', label: 'Address Line 2', category: 'Address' },
    { key: 'resAddrLine3', label: 'Address Line 3', category: 'Address' },
    { key: 'city', label: 'City', category: 'Address' },
    { key: 'state', label: 'State', category: 'Address' },
    { key: 'zipCode', label: 'ZIP Code', category: 'Address' },
    { key: 'zipSuffix', label: 'ZIP Suffix', category: 'Address' },

    // Contact
    { key: 'telephone', label: 'Telephone', category: 'Contact' },
    { key: 'email', label: 'Email', category: 'Contact' },

    // Political
    { key: 'party', label: 'Political Party', category: 'Political' },
    { key: 'gender', label: 'Gender', category: 'Political' },
    { key: 'DOB', label: 'Date of Birth', category: 'Political' },
    { key: 'L_T', label: 'L_T', category: 'Political' },

    // Districts
    {
      key: 'electionDistrict',
      label: 'Election District',
      category: 'Districts',
    },
    {
      key: 'countyLegDistrict',
      label: 'County Legislative District',
      category: 'Districts',
    },
    {
      key: 'stateAssmblyDistrict',
      label: 'State Assembly District',
      category: 'Districts',
    },
    {
      key: 'stateSenateDistrict',
      label: 'State Senate District',
      category: 'Districts',
    },
    {
      key: 'congressionalDistrict',
      label: 'Congressional District',
      category: 'Districts',
    },
    { key: 'CC_WD_Village', label: 'CC/WD/Village', category: 'Districts' },
    { key: 'townCode', label: 'Town Code', category: 'Districts' },

    // Dates
    {
      key: 'originalRegDate',
      label: 'Original Registration Date',
      category: 'Dates',
    },
    { key: 'statevid', label: 'State VID', category: 'Dates' },

    // Committee-specific
    {
      key: 'addressForCommittee',
      label: 'Address for Committee',
      category: 'Committee',
    },
  ];
};
