import { IneligibilityReason } from "@prisma/client";
import { z } from "zod";

const DEFAULT_MIN_MAX_SEATS = 1;
const DEFAULT_MAX_MAX_SEATS = 12;

function parseGuardrailBound(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

const configuredMin = parseGuardrailBound(
  process.env.GOVERNANCE_CONFIG_MIN_MAX_SEATS_PER_LTED,
  DEFAULT_MIN_MAX_SEATS,
);
const configuredMax = parseGuardrailBound(
  process.env.GOVERNANCE_CONFIG_MAX_MAX_SEATS_PER_LTED,
  DEFAULT_MAX_MAX_SEATS,
);

const minMaxSeatsPerLted =
  configuredMin <= configuredMax ? configuredMin : DEFAULT_MIN_MAX_SEATS;
const maxMaxSeatsPerLted =
  configuredMin <= configuredMax ? configuredMax : DEFAULT_MAX_MAX_SEATS;

export const GOVERNANCE_MAX_SEATS_GUARDRAILS = {
  minMaxSeatsPerLted,
  maxMaxSeatsPerLted,
} as const;

export const governanceConfigUpdateSchema = z
  .object({
    requiredPartyCode: z.string().trim().min(1, "requiredPartyCode is required"),
    maxSeatsPerLted: z.coerce
      .number()
      .int("maxSeatsPerLted must be an integer")
      .min(
        GOVERNANCE_MAX_SEATS_GUARDRAILS.minMaxSeatsPerLted,
        `maxSeatsPerLted must be at least ${String(GOVERNANCE_MAX_SEATS_GUARDRAILS.minMaxSeatsPerLted)}`,
      )
      .max(
        GOVERNANCE_MAX_SEATS_GUARDRAILS.maxMaxSeatsPerLted,
        `maxSeatsPerLted must be at most ${String(GOVERNANCE_MAX_SEATS_GUARDRAILS.maxMaxSeatsPerLted)}`,
      ),
    requireAssemblyDistrictMatch: z.boolean({
      invalid_type_error: "requireAssemblyDistrictMatch must be boolean",
    }),
    nonOverridableIneligibilityReasons: z
      .array(z.nativeEnum(IneligibilityReason), {
        invalid_type_error:
          "nonOverridableIneligibilityReasons must be an array",
      })
      .default([]),
  })
  .strict();

export type GovernanceConfigUpdateInput = z.infer<
  typeof governanceConfigUpdateSchema
>;
