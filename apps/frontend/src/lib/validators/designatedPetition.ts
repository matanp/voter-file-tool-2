import { z } from "zod";

export const defaultCustomPartyName = "Enter Party Name";

export const generateDesignatedPetitionDataSchema = z.object({
  candidates: z
    .array(
      z.object({
        name: z.string(),
        office: z.string(),
        address: z.string(),
      }),
    )
    .min(1, { message: "At least one candidate is required" }),
  vacancyAppointments: z
    .array(
      z.object({
        name: z.string(),
        address: z.string(),
      }),
    )
    .min(1, { message: "At least one vacancy appointment is required" }),
  party: z
    .string()
    .refine((val) => val.trim() !== "" && val !== defaultCustomPartyName, {
      message: "Party is required",
    }),
  electionDate: z.string().refine((date) => date !== "", {
    message: "Election date is required",
  }),
  numPages: z
    .number()
    .min(1, { message: "Minimum 1 page" })
    .max(25, { message: "No more than 25 pages allowed" }),
});

export type GenerateDeisnatedPetitionData = z.infer<
  typeof generateDesignatedPetitionDataSchema
>;
