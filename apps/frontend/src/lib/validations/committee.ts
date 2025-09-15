import { z } from "zod";

// Committee data validation schema
export const committeeDataSchema = z.object({
  cityTown: z.string().min(1, "City/Town is required"),
  legDistrict: z.string().min(1, "Legislative District is required"),
  electionDistrict: z.string().min(1, "Election District is required"),
  memberId: z.string().min(1, "Member ID is required"),
});

// Committee request data validation schema
export const committeeRequestDataSchema = z.object({
  cityTown: z.string().min(1, "City/Town is required"),
  legDistrict: z.string().min(1, "Legislative District is required"),
  electionDistrict: z
    .number()
    .int()
    .positive("Election District must be a positive integer"),
  addMemberId: z.string().nullable().optional(),
  removeMemberId: z.string().nullable().optional(),
  requestNotes: z.string().min(1, "Request notes are required"),
});

// Handle committee request data validation schema
export const handleCommitteeRequestDataSchema = z.object({
  committeeRequestId: z
    .number()
    .int()
    .positive("Committee Request ID must be a positive integer"),
  acceptOrReject: z.enum(["accept", "reject"], {
    errorMap: () => ({
      message: "Accept or reject must be either 'accept' or 'reject'",
    }),
  }),
});

// Fetch committee list query parameters validation schema
export const fetchCommitteeListQuerySchema = z.object({
  cityTown: z.string().min(1, "City/Town is required"),
  legDistrict: z.string().optional(),
  electionDistrict: z.string().min(1, "Election District is required"),
});

// Type exports derived from schemas
export type CommitteeData = z.infer<typeof committeeDataSchema>;
export type CommitteeRequestData = z.infer<typeof committeeRequestDataSchema>;
export type HandleCommitteeRequestData = z.infer<
  typeof handleCommitteeRequestDataSchema
>;
export type FetchCommitteeListQuery = z.infer<
  typeof fetchCommitteeListQuerySchema
>;
