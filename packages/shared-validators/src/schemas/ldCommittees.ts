import { z } from 'zod';

// Allowed fields from VoterRecord schema (excluding table relationships, hasDiscrepancy, committeeId, latestRecordEntryYear, latestRecordEntryNumber, and lastUpdate)
const allowedVoterRecordFields = [
  'VRCNUM',
  'addressForCommittee',
  'lastName',
  'firstName',
  'middleInitial',
  'suffixName',
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
  'telephone',
  'email',
  'mailingAddress1',
  'mailingAddress2',
  'mailingAddress3',
  'mailingAddress4',
  'mailingCity',
  'mailingState',
  'mailingZip',
  'mailingZipSuffix',
  'party',
  'gender',
  'DOB',
  'L_T',
  'electionDistrict',
  'countyLegDistrict',
  'stateAssmblyDistrict',
  'stateSenateDistrict',
  'congressionalDistrict',
  'CC_WD_Village',
  'townCode',
  'originalRegDate',
  'statevid',
] as const;

// Schema for allowed fields selection
export const allowedFieldsSchema = z
  .array(z.enum(allowedVoterRecordFields))
  .optional();

// CommitteeMember schema - now flexible based on selected fields
export const committeeMemberSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zip: z.string().min(1, 'ZIP code is required'),
    phone: z.string().optional(),
    // Additional fields can be added dynamically based on allowedFields
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
});

// Array schema
export const ldCommitteesArraySchema = z.array(ldCommitteesSchema);

// Type inference
export type AllowedVoterRecordFields =
  (typeof allowedVoterRecordFields)[number];
export type CommitteeMember = z.infer<typeof committeeMemberSchema>;
export type LDCommittees = z.infer<typeof ldCommitteesSchema>;
export type LDCommitteesArray = z.infer<typeof ldCommitteesArraySchema>;

// Re-export for convenience
export { allowedVoterRecordFields };
