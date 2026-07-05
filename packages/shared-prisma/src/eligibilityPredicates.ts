/**
 * Shared party / assembly-district eligibility predicates.
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

/**
 * Returns true when AD check is enabled and voter AD does not match expected crosswalk AD.
 * Missing or empty expected AD is treated as mismatch when the check is enabled.
 */
export function isAssemblyDistrictMismatch(
  voterAssemblyDistrict: string | null | undefined,
  expectedAssemblyDistrict: string | null | undefined,
  requireAssemblyDistrictMatch: boolean,
): boolean {
  if (!requireAssemblyDistrictMatch) {
    return false;
  }

  const expected = normalizeEligibilityText(expectedAssemblyDistrict);
  const actual = normalizeEligibilityText(voterAssemblyDistrict);

  return !expected || expected !== actual;
}
