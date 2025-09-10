import { z } from 'zod';

// Define compound field types with metadata
export const compoundTypeDefinitions = {
  address: {
    type: 'address' as const,
    label: 'Address Details',
    description: 'House number, street, apartment, city, state, zip',
    fields: [
      'houseNum',
      'street',
      'apartment',
      'halfAddress',
      'resAddrLine2',
      'resAddrLine3',
      'city',
      'state',
      'zipCode',
      'zipSuffix',
    ] as const,
  },
  mailingAddress: {
    type: 'mailingAddress' as const,
    label: 'Mailing Address',
    description: 'Complete mailing address fields',
    fields: [
      'mailingAddress1',
      'mailingAddress2',
      'mailingAddress3',
      'mailingAddress4',
      'mailingCity',
      'mailingState',
      'mailingZip',
      'mailingZipSuffix',
    ] as const,
  },
  name: {
    type: 'name' as const,
    label: 'Name Details',
    description: 'First name, middle initial, last name, suffix',
    fields: ['firstName', 'middleInitial', 'lastName', 'suffixName'] as const,
  },
  contact: {
    type: 'contact' as const,
    label: 'Contact Info',
    description: 'Phone and email',
    fields: ['telephone', 'email'] as const,
  },
  districts: {
    type: 'districts' as const,
    label: 'District Info',
    description: 'All district and political boundaries',
    fields: [
      'electionDistrict',
      'countyLegDistrict',
      'stateAssmblyDistrict',
      'stateSenateDistrict',
      'congressionalDistrict',
      'CC_WD_Village',
      'townCode',
    ] as const,
  },
} as const;

// Individual fields that don't belong to compound types
const individualFields = [
  'VRCNUM',
  'addressForCommittee',
  'party',
  'gender',
  'DOB',
  'L_T',
  'originalRegDate',
  'statevid',
] as const;

// All compound types
const compoundTypes = Object.values(compoundTypeDefinitions);

// Extract all field names from compound types
type CompoundFieldNames = {
  [K in keyof typeof compoundTypeDefinitions]: (typeof compoundTypeDefinitions)[K]['fields'][number];
}[keyof typeof compoundTypeDefinitions];

// All allowed fields (individual + compound field names)
const allowedVoterRecordFields = [
  ...individualFields,
  ...compoundTypes.flatMap((ct) => ct.fields),
] as const;

// Schema for allowed fields selection - now supports both individual fields and compound types
export const allowedFieldsSchema = z
  .array(z.enum(allowedVoterRecordFields))
  .optional();

// Schema for compound type selection
export const compoundTypeSelectionSchema = z
  .array(z.enum(['address', 'mailingAddress', 'name', 'contact', 'districts']))
  .optional();

// Base CommitteeMember schema with electionDistrict as required and base fields as optional
export const committeeMemberSchema = z
  .object({
    // electionDistrict is always present for grouping purposes
    electionDistrict: z.number().nullable(),
    // Base fields are optional - only included when their compound types are selected
    name: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    phone: z.string().optional(),
    // Additional fields can be added dynamically based on allowedFields and compoundTypes
  })
  .passthrough();

// LDCommittees schema
export const ldCommitteesSchema = z.object({
  cityTown: z.string().min(1, 'City/Town is required'),
  legDistrict: z
    .number()
    .int()
    .positive('Legislative district must be a positive integer'),
  committees: z.record(z.array(committeeMemberSchema)),
  allowedFields: allowedFieldsSchema,
  compoundTypes: compoundTypeSelectionSchema,
});

// Array schema
export const ldCommitteesArraySchema = z.array(ldCommitteesSchema);

// Type inference
export type AllowedVoterRecordFields =
  (typeof allowedVoterRecordFields)[number];
export type CompoundType =
  | 'address'
  | 'mailingAddress'
  | 'name'
  | 'contact'
  | 'districts';
export type CompoundTypeSelection = z.infer<typeof compoundTypeSelectionSchema>;
export type CommitteeMember = z.infer<typeof committeeMemberSchema>;
export type LDCommittees = z.infer<typeof ldCommitteesSchema>;
export type LDCommitteesArray = z.infer<typeof ldCommitteesArraySchema>;

// Helper types for compound field access
export type AddressFields =
  (typeof compoundTypeDefinitions.address)['fields'][number];
export type MailingAddressFields =
  (typeof compoundTypeDefinitions.mailingAddress)['fields'][number];
export type NameFields =
  (typeof compoundTypeDefinitions.name)['fields'][number];
export type ContactFields =
  (typeof compoundTypeDefinitions.contact)['fields'][number];
export type DistrictsFields =
  (typeof compoundTypeDefinitions.districts)['fields'][number];

// Utility functions for compound type operations
export const getCompoundTypeFields = (
  compoundType: CompoundType
): readonly string[] => {
  return compoundTypeDefinitions[compoundType].fields;
};

export const getFieldCompoundType = (
  field: AllowedVoterRecordFields
): CompoundType | null => {
  for (const [type, definition] of Object.entries(compoundTypeDefinitions)) {
    if ((definition.fields as readonly string[]).includes(field)) {
      return type as CompoundType;
    }
  }
  return null;
};

export const getCompoundTypeOptions = () => {
  return Object.values(compoundTypeDefinitions).map(
    ({ type, label, description }) => ({
      type,
      label,
      description,
    })
  );
};

// Function to flatten compound types into a single string
export const flattenCompoundType = (
  compoundType: CompoundType,
  voterRecord: Record<string, any>
): string => {
  const fields = getCompoundTypeFields(compoundType);
  const values: string[] = [];

  for (const field of fields) {
    const value = voterRecord[field];
    if (value !== null && value !== undefined) {
      if (field === 'DOB' || field === 'originalRegDate') {
        // Format dates
        const dateValue = value instanceof Date ? value : new Date(value);
        values.push(
          dateValue.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
        );
      } else {
        values.push(String(value));
      }
    }
  }

  return values.join(' | ');
};

// Function to generate dynamic headers based on actual data fields
export const generateDynamicHeaders = (
  members: CommitteeMember[],
  compoundTypes?: CompoundTypeSelection
): string[] => {
  if (members.length === 0) return ['Election District'];

  // Get all unique field names from the members
  const allFields = new Set<string>();
  for (const member of members) {
    for (const key of Object.keys(member)) {
      if (key !== 'electionDistrict') {
        allFields.add(key);
      }
    }
  }

  // Always start with Election District
  const headers = ['Election District'];

  // Add other fields in a consistent order
  const fieldOrder = [
    'name',
    'address',
    'city',
    'state',
    'zip',
    'phone',
    'firstName',
    'middleInitial',
    'lastName',
    'suffixName',
    'houseNum',
    'street',
    'apartment',
    'halfAddress',
    'resAddrLine2',
    'resAddrLine3',
    'mailingAddress1',
    'mailingAddress2',
    'mailingAddress3',
    'mailingAddress4',
    'mailingCity',
    'mailingState',
    'mailingZip',
    'mailingZipSuffix',
    'telephone',
    'email',
    'electionDistrict',
    'countyLegDistrict',
    'stateAssmblyDistrict',
    'stateSenateDistrict',
    'congressionalDistrict',
    'CC_WD_Village',
    'townCode',
    'VRCNUM',
    'addressForCommittee',
    'party',
    'gender',
    'DOB',
    'L_T',
    'originalRegDate',
    'statevid',
  ];

  // Add fields in the preferred order if they exist
  for (const field of fieldOrder) {
    if (allFields.has(field)) {
      headers.push(field);
      allFields.delete(field);
    }
  }

  // Add any remaining fields that weren't in the preferred order
  for (const field of Array.from(allFields).sort()) {
    headers.push(field);
  }

  return headers;
};

// Re-export for convenience
export { allowedVoterRecordFields, compoundTypes };
