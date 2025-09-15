import { z } from "zod";

// Committee data validation schema
export const committeeDataSchema = z
  .object({
    cityTown: z.string().trim().min(1, "City/Town is required"),
    legDistrict: z.string().trim().min(1, "Legislative District is required"),
    electionDistrict: z
      .string()
      .trim()
      .regex(/^\d+$/, "Election District must contain only digits"),
    memberId: z.string().trim().min(1, "Member ID is required"),
  })
  .strict();

// Committee request data validation schema
export const committeeRequestDataSchema = z
  .object({
    cityTown: z.string().trim().min(1, "City/Town is required"),
    legDistrict: z.string().trim().min(1, "Legislative District is required"),
    electionDistrict: z.coerce
      .number()
      .int()
      .positive("Election District must be a positive integer"),
    addMemberId: z.string().nullable().optional(),
    removeMemberId: z.string().nullable().optional(),
    requestNotes: z
      .string()
      .trim()
      .min(1, "Request notes are required")
      .max(1000, "Notes must be 1000 characters or fewer"),
  })
  .strict();

// Handle committee request data validation schema
export const handleCommitteeRequestDataSchema = z
  .object({
    committeeRequestId: z
      .number()
      .int()
      .positive("Committee Request ID must be a positive integer"),
    acceptOrReject: z.enum(["accept", "reject"], {
      errorMap: () => ({
        message: "Accept or reject must be either 'accept' or 'reject'",
      }),
    }),
  })
  .strict();

// Fetch committee list query parameters validation schema
export const fetchCommitteeListQuerySchema = z
  .object({
    cityTown: z.string().trim().min(1, "City/Town is required"),
    legDistrict: z.string().trim().optional(),
    electionDistrict: z
      .string()
      .trim()
      .regex(/^\d+$/, "Election District must contain only digits"),
  })
  .strict();

// Type exports derived from schemas
export type CommitteeData = z.infer<typeof committeeDataSchema>;
export type CommitteeRequestData = z.infer<typeof committeeRequestDataSchema>;
export type HandleCommitteeRequestData = z.infer<
  typeof handleCommitteeRequestDataSchema
>;
export type FetchCommitteeListQuery = z.infer<
  typeof fetchCommitteeListQuerySchema
>;
