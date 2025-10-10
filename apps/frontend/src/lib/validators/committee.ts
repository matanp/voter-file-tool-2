import { z } from "zod";
import { voterRecordSchema } from "@voter-file-tool/shared-validators";

// Use the existing voterRecordSchema which handles dates as strings (API format)
export const apiVoterRecordSchema = voterRecordSchema;

// Committee-specific schemas
export const committeeWithMembersSchema = z.object({
  id: z.number(),
  cityTown: z.string(),
  legDistrict: z.number(),
  electionDistrict: z.number(),
  committeeMemberList: z.array(apiVoterRecordSchema),
  CommitteeRequest: z.array(z.any()).optional(), // Prisma relation, not needed for validation
  CommitteeDiscrepancyRecords: z.array(z.any()).optional(), // Prisma relation, not needed for validation
});

// Schema for when the API returns an array of committees
export const committeeArraySchema = z.array(committeeWithMembersSchema);

export const committeeListSchema = z.object({
  id: z.number(),
  cityTown: z.string(),
  legDistrict: z.number(),
  electionDistrict: z.number(),
});

// Committee API response types
export interface CommitteeApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CommitteeErrorResponse {
  success: false;
  error: string;
  details?: string;
}
