import { z } from "zod";
import { generateDesignatedPetitionDataSchema } from "./designatedPetition";
import { ldCommitteesArraySchema } from "./ldCommittees";

const baseApiSchema = z.object({
  //   requestId: z.string().uuid(),
  //   timestamp: z.string().datetime(),
  //   requestedBy: z.string(),
});

export const generateReportSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("designatedPetition"),
    ...baseApiSchema.shape,
    payload: generateDesignatedPetitionDataSchema,
  }),
  z.object({
    type: z.literal("ldCommittees"),
    ...baseApiSchema.shape,
    payload: ldCommitteesArraySchema,
  }),
]);

export type GenerateReportData = z.infer<typeof generateReportSchema>;
