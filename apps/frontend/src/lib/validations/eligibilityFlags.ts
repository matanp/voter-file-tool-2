import { EligibilityFlagReason, EligibilityFlagStatus } from "@prisma/client";
import { z } from "zod";

const optionalNonEmptyString = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (value == null || value === "") return undefined;
    return value;
  });

export const runEligibilityFlaggingSchema = z
  .object({
    termId: optionalNonEmptyString,
  })
  .strict();

export const eligibilityFlagsQuerySchema = z
  .object({
    status: z.nativeEnum(EligibilityFlagStatus).optional(),
    reason: z.nativeEnum(EligibilityFlagReason).optional(),
    termId: optionalNonEmptyString,
    committeeListId: z
      .preprocess((value) => {
        if (value == null || value === "") return undefined;
        return Number(value);
      }, z.number().int().positive().optional()),
  })
  .strict();

export const reviewEligibilityFlagSchema = z
  .object({
    decision: z.enum(["confirm", "dismiss"]),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

export type RunEligibilityFlaggingData = z.infer<
  typeof runEligibilityFlaggingSchema
>;
export type EligibilityFlagsQuery = z.infer<typeof eligibilityFlagsQuerySchema>;
export type ReviewEligibilityFlagData = z.infer<
  typeof reviewEligibilityFlagSchema
>;
