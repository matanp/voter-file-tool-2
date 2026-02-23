/**
 * Human-readable messages for IneligibilityReason (SRS §2.1).
 * Used by AddCommitteeForm and API responses.
 */

import type { IneligibilityReason } from "@prisma/client";

export const INELIGIBILITY_REASON_MESSAGES: Record<
  IneligibilityReason,
  string
> = {
  NOT_REGISTERED: "Voter record not found.",
  PARTY_MISMATCH: "Party does not match the required party for this committee.",
  ASSEMBLY_DISTRICT_MISMATCH:
    "Assembly district does not match the committee's district.",
  CAPACITY: "Committee is at capacity (no open seats).",
  ALREADY_IN_ANOTHER_COMMITTEE:
    "Member is already active in another committee for this term.",
};

/** Deterministic fallback when API does not return structured `reasons[]`. */
export const GENERIC_INELIGIBILITY_MESSAGE =
  "Submission failed eligibility checks.";

/** Standard leader guidance for hard-stop exceptions (SRS Scenario 2). */
export const ELIGIBILITY_ESCALATION_MESSAGE =
  "If you believe this is an exception, contact MCDC staff.";

/**
 * Maps a single hard-stop reason code to user-facing copy.
 * Unknown reasons use a deterministic generic fallback.
 */
export function getIneligibilityMessage(
  reason: string,
): string {
  return (
    INELIGIBILITY_REASON_MESSAGES[reason as IneligibilityReason] ??
    GENERIC_INELIGIBILITY_MESSAGE
  );
}

/**
 * Maps API `reasons[]` to display messages.
 * Falls back to one deterministic message when reasons are missing.
 */
export function getIneligibilityMessages(
  reasons: readonly string[] | null | undefined,
): string[] {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    return [GENERIC_INELIGIBILITY_MESSAGE];
  }

  return reasons.map((reason: string) => getIneligibilityMessage(reason));
}
