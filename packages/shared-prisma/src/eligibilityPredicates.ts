/**
 * Shared party eligibility predicates. The assembly-district rule lives in committeeResidency.
 * Used by admission gate (validateEligibility) and BOE standing audit (detectFlagsForMembership).
 */

/** Trim null/undefined to empty string for eligibility comparisons. */
export function normalizeEligibilityText(
  value: string | null | undefined,
): string {
  return (value ?? "").trim();
}

/**
 * Returns true when voter party does not match governance config.
 * Comparison is trim-only (not case-insensitive): "dem" vs "DEM" is a mismatch.
 */
export function isPartyMismatch(
  voterParty: string | null | undefined,
  requiredPartyCode: string | null | undefined,
): boolean {
  return (
    normalizeEligibilityText(voterParty) !==
    normalizeEligibilityText(requiredPartyCode)
  );
}
