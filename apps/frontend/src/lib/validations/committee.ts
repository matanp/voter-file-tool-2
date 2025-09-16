import { z } from "zod";
import type { CommitteeWithMembers } from "~/app/committees/committeeUtils";

// Committee data validation schema
export const committeeDataSchema = z
  .object({
    cityTown: z.string().trim().min(1, "City/Town is required"),
    legDistrict: z.coerce
      .number()
      .int()
      .optional()
      .refine((val) => val === undefined || val > 0, {
        message:
          "Legislative District must be a positive integer when provided",
      }),
    electionDistrict: z.coerce
      .number()
      .int()
      .positive("Election District must be a positive integer"),
    memberId: z.string().trim().min(1, "Member ID is required"),
  })
  .strict();

// Committee request data validation schema
export const committeeRequestDataSchema = z
  .object({
    cityTown: z.string().trim().min(1, "City/Town is required"),
    legDistrict: z.coerce
      .number()
      .int()
      .optional()
      .refine((val) => val === undefined || val > 0, {
        message:
          "Legislative District must be a positive integer when provided",
      }),
    electionDistrict: z.coerce
      .number()
      .int()
      .positive("Election District must be a positive integer"),
    addMemberId: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((v) => (v == null || v === "" ? undefined : v)),
    removeMemberId: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((v) => (v == null || v === "" ? undefined : v)),
    requestNotes: z
      .string()
      .trim()
      .max(1000, "Notes must be 1000 characters or fewer")
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      const hasAddMember = data.addMemberId && data.addMemberId.trim() !== "";
      const hasRemoveMember =
        data.removeMemberId && data.removeMemberId.trim() !== "";
      return Boolean(hasAddMember) || Boolean(hasRemoveMember);
    },
    {
      message:
        "At least one action is required: either addMemberId or removeMemberId must be provided",
    },
  );

// Handle committee request data validation schema
export const handleCommitteeRequestDataSchema = z
  .object({
    committeeRequestId: z.coerce
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
    legDistrict: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => {
          if (val === undefined || val === "") return true;
          const parsed = Number(val);
          return Number.isInteger(parsed) && parsed > 0;
        },
        {
          message:
            "Legislative District must be a positive integer when provided",
        },
      ),
    electionDistrict: z
      .string()
      .trim()
      .regex(/^\d+$/, "Election District must contain only digits"),
  })
  .strict();

// API Response types for committee operations
export type AddCommitteeResponse =
  | {
      success: true;
      committee: CommitteeWithMembers;
      message: string;
      idempotent?: true;
    }
  | { success: false; error: string };

export type CommitteeRequestResponse =
  | {
      success: true;
      message: string;
    }
  | { success: false; error: string };

// Type exports derived from schemas
export type CommitteeData = z.infer<typeof committeeDataSchema>;
export type CommitteeRequestData = z.infer<typeof committeeRequestDataSchema>;
export type HandleCommitteeRequestData = z.infer<
  typeof handleCommitteeRequestDataSchema
>;
export type FetchCommitteeListQuery = z.infer<
  typeof fetchCommitteeListQuerySchema
>;
