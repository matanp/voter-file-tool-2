import { z } from 'zod';

// VoterRecord schema that matches the Prisma model
export const voterRecordSchema = z.object({
  VRCNUM: z.string(),
  committeeId: z.number().nullable(),
  addressForCommittee: z.string().nullable(),
  latestRecordEntryYear: z.number(),
  latestRecordEntryNumber: z.number(),
  lastName: z.string().nullable(),
  firstName: z.string().nullable(),
  middleInitial: z.string().nullable(),
  suffixName: z.string().nullable(),
  houseNum: z.number().nullable(),
  street: z.string().nullable(),
  apartment: z.string().nullable(),
  halfAddress: z.string().nullable(),
  resAddrLine2: z.string().nullable(),
  resAddrLine3: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
  zipSuffix: z.string().nullable(),
  telephone: z.string().nullable(),
  email: z.string().nullable(),
  mailingAddress1: z.string().nullable(),
  mailingAddress2: z.string().nullable(),
  mailingAddress3: z.string().nullable(),
  mailingAddress4: z.string().nullable(),
  mailingCity: z.string().nullable(),
  mailingState: z.string().nullable(),
  mailingZip: z.string().nullable(),
  mailingZipSuffix: z.string().nullable(),
  party: z.string().nullable(),
  gender: z.string().nullable(),
  DOB: z.string().nullable(),
  L_T: z.string().nullable(),
  electionDistrict: z.number().nullable(),
  countyLegDistrict: z.string().nullable(),
  stateAssmblyDistrict: z.string().nullable(),
  stateSenateDistrict: z.string().nullable(),
  congressionalDistrict: z.string().nullable(),
  CC_WD_Village: z.string().nullable(),
  townCode: z.string().nullable(),
  lastUpdate: z.string().nullable(),
  originalRegDate: z.string().nullable(),
  statevid: z.string().nullable(),
  hasDiscrepancy: z.boolean().nullable(),
});

// Type inference
export type VoterRecordSchema = z.infer<typeof voterRecordSchema>;

// API VoterRecord type with string dates (for API serialization)
export type VoterRecordAPI = VoterRecordSchema;

export const partialVoterRecordSchema = voterRecordSchema.partial();

// Type for partial voter records
export type PartialVoterRecordAPI = z.infer<typeof partialVoterRecordSchema>;
