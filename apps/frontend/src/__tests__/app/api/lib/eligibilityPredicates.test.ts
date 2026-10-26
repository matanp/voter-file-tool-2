/**
 * Unit tests for shared eligibility predicates (party). The assembly-district cases live with the
 * residency module in packages/shared-prisma/src/__tests__/committeeResidency.test.ts.
 */

import {
  isPartyMismatch,
  normalizeEligibilityText,
} from "@voter-file-tool/shared-prisma";

describe("eligibilityPredicates", () => {
  describe("normalizeEligibilityText", () => {
    it("trims whitespace and coalesces null to empty string", () => {
      expect(normalizeEligibilityText(" DEM ")).toBe("DEM");
      expect(normalizeEligibilityText(null)).toBe("");
      expect(normalizeEligibilityText(undefined)).toBe("");
    });
  });

  describe("isPartyMismatch", () => {
    it("returns false for exact match", () => {
      expect(isPartyMismatch("DEM", "DEM")).toBe(false);
    });

    it("returns false when whitespace differs only", () => {
      expect(isPartyMismatch(" DEM ", "DEM")).toBe(false);
    });

    it("returns true for different parties", () => {
      expect(isPartyMismatch("REP", "DEM")).toBe(true);
    });

    it("returns false when both party values are null", () => {
      expect(isPartyMismatch(null, null)).toBe(false);
    });

    it("returns true when voter party is null but required is set", () => {
      expect(isPartyMismatch(null, "DEM")).toBe(true);
    });

    it("is trim-only, not case-insensitive", () => {
      expect(isPartyMismatch("dem", "DEM")).toBe(true);
    });
  });

  describe("isPartyMismatch (package export smoke)", () => {
    it("is exported from @voter-file-tool/shared-prisma", () => {
      expect(isPartyMismatch("DEM", "DEM")).toBe(false);
      expect(isPartyMismatch("REP", "DEM")).toBe(true);
    });
  });
});
