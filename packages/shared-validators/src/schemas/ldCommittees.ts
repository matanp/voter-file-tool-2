import { z } from 'zod';

// Individual field schemas for VoterRecord fields that can be optionally included
export const voterRecordFieldSchemas = {
  // Basic identification fields
  VRCNUM: z.string().min(1, 'VRCNUM is required'),
  lastName: z.string().optional(),
  firstName: z.string().optional(),
  middleInitial: z.string().optional(),
  suffixName: z.string().optional(),

  // Address fields
  houseNum: z.number().int().optional(),
  street: z.string().optional(),
  apartment: z.string().optional(),
  halfAddress: z.string().optional(),
  resAddrLine2: z.string().optional(),
  resAddrLine3: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  zipSuffix: z.string().optional(),

  // Contact information
  telephone: z.string().optional(),
  email: z.string().email().optional(),

  // Mailing address
  mailingAddress1: z.string().optional(),
  mailingAddress2: z.string().optional(),
  mailingAddress3: z.string().optional(),
  mailingAddress4: z.string().optional(),
  mailingCity: z.string().optional(),
  mailingState: z.string().optional(),
  mailingZip: z.string().optional(),
  mailingZipSuffix: z.string().optional(),

  // Political information
  party: z.string().optional(),
  gender: z.string().optional(),
  DOB: z.date().optional(),
  L_T: z.string().optional(),

  // District information
  electionDistrict: z.number().int().optional(),
  countyLegDistrict: z.string().optional(),
  stateAssmblyDistrict: z.string().optional(),
  stateSenateDistrict: z.string().optional(),
  congressionalDistrict: z.string().optional(),
  CC_WD_Village: z.string().optional(),
  townCode: z.string().optional(),

  originalRegDate: z.date().optional(),
  statevid: z.string().optional(),

  // Committee-specific fields
  addressForCommittee: z.string().optional(),
} as const;

// Helper function to create a schema with selected VoterRecord fields
export const createCommitteeMemberSchema = (
  selectedFields: (keyof typeof voterRecordFieldSchemas)[] = []
) => {
  const baseSchema = {
    // Always include these core compound fields
    name: z.string().min(1, 'Name is required'),
    address: z.string().min(1, 'Address is required'),
  };

  // Add selected VoterRecord fields
  const additionalFields = selectedFields.reduce(
    (acc, field) => {
      acc[field] = voterRecordFieldSchemas[field];
      return acc;
    },
    {} as Record<string, z.ZodTypeAny>
  );

  return z.object({
    ...baseSchema,
    ...additionalFields,
  });
};

// Default CommitteeMember schema (backward compatible)
export const committeeMemberSchema = createCommitteeMemberSchema();

// LDCommittees schema with configurable member fields
export const createLDCommitteesSchema = (
  selectedFields: (keyof typeof voterRecordFieldSchemas)[] = []
) => {
  const memberSchema = createCommitteeMemberSchema(selectedFields);

  return z.object({
    cityTown: z.string().min(1, 'City/Town is required'),
    legDistrict: z
      .number()
      .int()
      .positive('Legislative district must be a positive integer'),
    committees: z.record(z.array(memberSchema)),
  });
};

export const ldCommitteesSchema = createLDCommitteesSchema(); //default schema

// Array schema factory
export const createLDCommitteesArraySchema = (
  selectedFields: (keyof typeof voterRecordFieldSchemas)[] = []
) => {
  return z.array(createLDCommitteesSchema(selectedFields));
};

// default schema
export const ldCommitteesArraySchema = createLDCommitteesArraySchema();

// Type inference
export type CommitteeMember = z.infer<typeof committeeMemberSchema>;
export type LDCommittees = z.infer<typeof ldCommitteesSchema>;
export type LDCommitteesArray = z.infer<typeof ldCommitteesArraySchema>;

// Utility types for dynamic schemas
export type VoterRecordField = keyof typeof voterRecordFieldSchemas;
export type CommitteeMemberWithFields = z.infer<
  ReturnType<typeof createCommitteeMemberSchema>
>;
export type LDCommitteesWithFields = z.infer<
  ReturnType<typeof createLDCommitteesSchema>
>;
export type LDCommitteesArrayWithFields = z.infer<
  ReturnType<typeof createLDCommitteesArraySchema>
>;
