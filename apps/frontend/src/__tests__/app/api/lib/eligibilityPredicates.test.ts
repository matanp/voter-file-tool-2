/**
 * Unit tests for shared eligibility predicates (party / assembly-district).
 */

import { isPartyMismatch } from "@voter-file-tool/shared-prisma";
import {
  isAssemblyDistrictMismatch,
  normalizeEligibilityText,
} from "~/app/api/lib/eligibilityService";

describe("eligibilityPredicates", () => {
  describe("normalizeEligibilityText", () => {
    it("trims whitespace and coalesces null to empty string", () => {
      expect(normalizeEligibilityText(" DEM ")).toBe("DEM");
      expect(normalizeEligibilityText(null)).toBe("");
      expect(normalizeEligibilityText(undefined)).toBe("");
    });
  });

  describe("isPartyMismatch (via eligibilityService)", () => {
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

  describe("isAssemblyDistrictMismatch", () => {
    it("returns false for exact match", () => {
      expect(isAssemblyDistrictMismatch("1", "1", true)).toBe(false);
    });

    it("returns false when whitespace differs only", () => {
      expect(isAssemblyDistrictMismatch(" 1 ", "1", true)).toBe(false);
    });

    it("returns true for different assembly districts", () => {
      expect(isAssemblyDistrictMismatch("2", "1", true)).toBe(true);
    });

    it("returns false when AD check is disabled", () => {
      expect(isAssemblyDistrictMismatch("2", "1", false)).toBe(false);
      expect(isAssemblyDistrictMismatch(null, null, false)).toBe(false);
    });

    it("returns true when voter AD is missing but expected AD is present", () => {
      expect(isAssemblyDistrictMismatch(null, "1", true)).toBe(true);
    });

    it("returns true when expected AD is missing even if voter AD is empty", () => {
      expect(isAssemblyDistrictMismatch(null, null, true)).toBe(true);
      expect(isAssemblyDistrictMismatch("", null, true)).toBe(true);
      expect(isAssemblyDistrictMismatch("", "", true)).toBe(true);
    });

    it("returns true when voter AD is empty but expected AD is present", () => {
      expect(isAssemblyDistrictMismatch("", "1", true)).toBe(true);
    });
  });
});
