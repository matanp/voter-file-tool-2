import type { RemovalReason } from "@prisma/client";

/** SRS 2.5: user-facing labels for removal and resignation reasons. */
export const REMOVAL_REASON_LABELS: Record<RemovalReason, string> = {
  PARTY_CHANGE: "Party change",
  MOVED_OUT_OF_DISTRICT: "Moved out of district",
  INACTIVE_REGISTRATION: "Inactive registration",
  DECEASED: "Deceased",
  OTHER: "Other",
};

/** The reasons in display order. */
export const REMOVAL_REASONS = Object.keys(REMOVAL_REASON_LABELS) as RemovalReason[];
