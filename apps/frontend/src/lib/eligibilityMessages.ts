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

export function getIneligibilityMessage(reason: IneligibilityReason): string {
  return INELIGIBILITY_REASON_MESSAGES[reason] ?? reason;
}
