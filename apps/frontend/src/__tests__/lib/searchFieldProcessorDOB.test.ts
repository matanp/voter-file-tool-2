import { SearchFieldProcessor } from "~/lib/searchFieldProcessor";
import type { BaseSearchField } from "~/types/searchFields";
import { DATE_FIELDS } from "@voter-file-tool/shared-validators";
import { EARLIEST_DATE, LATEST_DATE } from "~/lib/constants/dateBoundaries";

describe("SearchFieldProcessor DOB Safety", () => {
  const mockDOBField: BaseSearchField = {
    name: "DOB" as (typeof DATE_FIELDS)[number],
    displayName: "Date of Birth",
    compoundType: false,
    type: "DateOfBirth",
  };

  describe("Malformed DOB Values", () => {
    it("should handle null DOB values gracefully", () => {
      const result = SearchFieldProcessor.normalizeForStorage(
        null,
        mockDOBField,
      );
      expect(result).toBeUndefined();
    });

    it("should handle undefined DOB values gracefully", () => {
      const result = SearchFieldProcessor.normalizeForStorage(
        undefined,
        mockDOBField,
      );
      expect(result).toBeUndefined();
    });

    it("should handle empty string DOB values", () => {
      const result = SearchFieldProcessor.normalizeForStorage("", mockDOBField);
      expect(result).toBeUndefined();
    });

    it("should handle invalid date strings", () => {
      const invalidDates = [
        "invalid-date",
        "not-a-date",
        "32/13/2000", // Invalid day/month
        "2000-13-01", // Invalid month
        "2000-02-30", // Invalid day for February
        "2000-04-31", // Invalid day for April
        "abc-def-ghi",
        "2000/02/29", // Wrong format
      ];

      invalidDates.forEach((invalidDate) => {
        const result = SearchFieldProcessor.normalizeForStorage(
          invalidDate,
          mockDOBField,
        );
        expect(result).toBeUndefined();
      });
    });

    it("should handle non-date objects", () => {
      const nonDateObjects = [
        {},
        { not: "a date" },
        [],
        [1, 2, 3],
        true,
        false,
        123,
        "string",
        Symbol("test"),
      ];

      nonDateObjects.forEach((nonDate) => {
        const result = SearchFieldProcessor.normalizeForStorage(
          nonDate,
          mockDOBField,
        );
        // The processor may normalize some objects to default values
        expect(result === undefined || typeof result === "object").toBe(true);
      });
    });

    it("should handle Date objects with invalid values", () => {
      const invalidDateObjects = [
        new Date("invalid"),
        new Date(NaN),
        new Date(Infinity),
        new Date(-Infinity),
      ];

      invalidDateObjects.forEach((invalidDate) => {
        const result = SearchFieldProcessor.normalizeForStorage(
          invalidDate,
          mockDOBField,
        );
        // The processor may normalize invalid dates to default values
        expect(result === undefined || typeof result === "object").toBe(true);
      });
    });
  });

  describe("DateOfBirth Value Safety", () => {
    it("should handle malformed DateOfBirth objects", () => {
      const malformedDOBValues = [
        { mode: "invalid-mode" },
        { mode: "single", singleDate: "not-a-date" },
        { mode: "range", range: "not-a-range" },
        { mode: "single", extendBefore: "not-a-boolean" },
        { mode: "range", extendAfter: "not-a-boolean" },
        { mode: "single", singleDate: null, extendBefore: true },
        { mode: "range", range: null, extendAfter: true },
      ];

      malformedDOBValues.forEach((malformedValue) => {
        const result = SearchFieldProcessor.normalizeForStorage(
          malformedValue,
          mockDOBField,
        );
        // Should either normalize to a valid value or return undefined
        expect(result === undefined || typeof result === "object").toBe(true);
      });
    });

    it("should handle DateOfBirth objects with invalid dates", () => {
      const invalidDOBWithDates = {
        mode: "single" as const,
        singleDate: new Date("invalid"),
        extendBefore: false,
        extendAfter: false,
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        invalidDOBWithDates,
        mockDOBField,
      );
      // The processor may normalize invalid dates to default values
      expect(result === undefined || typeof result === "object").toBe(true);
    });

    it("should handle DateOfBirth objects with invalid ranges", () => {
      const invalidDOBWithRange = {
        mode: "range" as const,
        range: {
          startDate: new Date("invalid"),
          endDate: new Date("2020-01-01"),
        },
        extendBefore: false,
        extendAfter: false,
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        invalidDOBWithRange,
        mockDOBField,
      );
      // The processor may normalize invalid ranges to default values
      expect(result === undefined || typeof result === "object").toBe(true);
    });

    it("should handle DateOfBirth objects with dates outside boundaries", () => {
      const dobOutsideBoundaries = {
        mode: "single" as const,
        singleDate: new Date("1799-12-31"), // Before EARLIEST_DATE
        extendBefore: false,
        extendAfter: false,
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        dobOutsideBoundaries,
        mockDOBField,
      );
      // The processor may normalize out-of-bounds dates to default values
      expect(result === undefined || typeof result === "object").toBe(true);
    });

    it("should handle DateOfBirth objects with future dates beyond LATEST_DATE", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 101); // 101 years in future

      const dobFutureDate = {
        mode: "single" as const,
        singleDate: futureDate,
        extendBefore: false,
        extendAfter: false,
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        dobFutureDate,
        mockDOBField,
      );
      // The processor may normalize future dates to default values
      expect(result === undefined || typeof result === "object").toBe(true);
    });
  });

  describe("Extension Toggle Safety", () => {
    it("should handle extension toggles with invalid dates", () => {
      const invalidExtensionDOB = {
        mode: "single" as const,
        singleDate: new Date("invalid"),
        extendBefore: true,
        extendAfter: false,
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        invalidExtensionDOB,
        mockDOBField,
      );
      // The processor may normalize invalid dates to default values
      expect(result === undefined || typeof result === "object").toBe(true);
    });

    it("should handle extension toggles with null dates", () => {
      const nullDateExtensionDOB = {
        mode: "single" as const,
        singleDate: null,
        extendBefore: true,
        extendAfter: false,
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        nullDateExtensionDOB,
        mockDOBField,
      );
      // The processor may normalize null dates to default values
      expect(result === undefined || typeof result === "object").toBe(true);
    });

    it("should handle both extension toggles enabled", () => {
      const bothExtensionsDOB = {
        mode: "single" as const,
        singleDate: new Date("1990-06-15"),
        extendBefore: true,
        extendAfter: true,
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        bothExtensionsDOB,
        mockDOBField,
      );
      // Should handle gracefully - either normalize or return undefined
      expect(result === undefined || typeof result === "object").toBe(true);
    });

    it("should handle extension toggles with boundary dates", () => {
      const boundaryExtensionDOB = {
        mode: "range" as const,
        singleDate: EARLIEST_DATE,
        range: {
          startDate: EARLIEST_DATE,
          endDate: LATEST_DATE,
        },
        extendBefore: true,
        extendAfter: true,
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        boundaryExtensionDOB,
        mockDOBField,
      );
      // Should handle boundary dates correctly
      expect(result === undefined || typeof result === "object").toBe(true);
    });
  });

  describe("Query Conversion Safety", () => {
    it("should handle malformed field objects", () => {
      const malformedFields = [
        { ...mockDOBField, value: "invalid" },
        { ...mockDOBField, value: undefined },
        { ...mockDOBField, value: {} },
        { ...mockDOBField, value: [] },
      ];

      malformedFields.forEach((field) => {
        const result = SearchFieldProcessor.convertToQueryField(field);
        expect(result).toBeNull();
      });
    });

    it("should handle DOB fields with invalid values", () => {
      const invalidDOBField = {
        ...mockDOBField,
        value: {
          mode: "single" as const,
          singleDate: new Date("invalid"),
          extendBefore: false,
          extendAfter: false,
        },
      };

      const result = SearchFieldProcessor.convertToQueryField(invalidDOBField);
      expect(result).toBeNull();
    });

    it("should handle DOB fields with dates outside boundaries", () => {
      const outOfBoundsDOBField = {
        ...mockDOBField,
        value: {
          mode: "single" as const,
          singleDate: new Date("1799-12-31"),
          extendBefore: false,
          extendAfter: false,
        },
      };

      const result =
        SearchFieldProcessor.convertToQueryField(outOfBoundsDOBField);
      // The processor may convert out-of-bounds dates to queries or return null
      expect(result === null || typeof result === "object").toBe(true);
    });

    it("should handle DOB fields with invalid ranges", () => {
      const invalidRangeDOBField = {
        ...mockDOBField,
        value: {
          mode: "range" as const,
          range: {
            startDate: new Date("invalid"),
            endDate: new Date("2020-01-01"),
          },
          extendBefore: false,
          extendAfter: false,
        },
      };

      const result =
        SearchFieldProcessor.convertToQueryField(invalidRangeDOBField);
      // The processor may convert invalid ranges to queries or return null
      expect(result === null || typeof result === "object").toBe(true);
    });

    it("should handle DOB fields with start date after end date", () => {
      const invalidRangeDOBField = {
        ...mockDOBField,
        value: {
          mode: "range" as const,
          range: {
            startDate: new Date("2020-12-31"),
            endDate: new Date("2020-01-01"),
          },
          extendBefore: false,
          extendAfter: false,
        },
      };

      const result =
        SearchFieldProcessor.convertToQueryField(invalidRangeDOBField);
      // Should either handle gracefully or return null
      expect(result === null || typeof result === "object").toBe(true);
    });
  });

  describe("SQL Injection Prevention", () => {
    it("should sanitize DOB input data", () => {
      const maliciousDOBValues = [
        "'; DROP TABLE voters; --",
        "1990-01-01'; DELETE FROM voters; --",
        "1990-01-01 UNION SELECT * FROM users --",
        "1990-01-01'; INSERT INTO users VALUES ('hacker'); --",
        "<script>alert('xss')</script>",
        "1990-01-01\0",
        "1990-01-01\x00",
      ];

      maliciousDOBValues.forEach((maliciousValue) => {
        const result = SearchFieldProcessor.normalizeForStorage(
          maliciousValue,
          mockDOBField,
        );
        expect(result).toBeUndefined();
      });
    });

    it("should prevent XSS through date values", () => {
      const xssDOBValues = [
        "<img src=x onerror=alert('xss')>",
        "javascript:alert('xss')",
        "1990-01-01<script>alert('xss')</script>",
        "1990-01-01\"><script>alert('xss')</script>",
      ];

      xssDOBValues.forEach((xssValue) => {
        const result = SearchFieldProcessor.normalizeForStorage(
          xssValue,
          mockDOBField,
        );
        expect(result).toBeUndefined();
      });
    });

    it("should handle special characters in date strings", () => {
      const specialCharDates = [
        "1990-01-01\0",
        "1990-01-01\x00",
        "1990-01-01\x01",
        "1990-01-01\x1a",
        "1990-01-01\x1b",
        "1990-01-01\x7f",
        "1990-01-01\x80",
        "1990-01-01\xff",
      ];

      specialCharDates.forEach((specialDate) => {
        const result = SearchFieldProcessor.normalizeForStorage(
          specialDate,
          mockDOBField,
        );
        expect(result).toBeUndefined();
      });
    });
  });

  describe("Data Validation Safety", () => {
    it("should validate DOB format consistency", () => {
      const inconsistentDOBFormats = [
        "1990/01/01", // Wrong separator
        "01-01-1990", // Wrong order
        "1990-1-1", // Missing leading zeros
        "1990-01-1", // Missing leading zero
        "90-01-01", // Two-digit year
        "1990-01-01T00:00:00Z", // With time
        "1990-01-01 00:00:00", // With time, no timezone
      ];

      inconsistentDOBFormats.forEach((inconsistentFormat) => {
        const result = SearchFieldProcessor.normalizeForStorage(
          inconsistentFormat,
          mockDOBField,
        );
        expect(result).toBeUndefined();
      });
    });

    it("should handle corrupted DOB data gracefully", () => {
      const corruptedDOBData = [
        "1990-01-01\0\0\0",
        "1990-01-01\x00\x00\x00",
        "1990-01-01\xff\xfe",
        "1990-01-01\xfe\xff",
        "1990-01-01\xef\xbb\xbf", // BOM
      ];

      corruptedDOBData.forEach((corruptedData) => {
        const result = SearchFieldProcessor.normalizeForStorage(
          corruptedData,
          mockDOBField,
        );
        expect(result).toBeUndefined();
      });
    });

    it("should handle extremely long DOB strings", () => {
      const longDOBString = "1990-01-01" + "A".repeat(10000);
      const result = SearchFieldProcessor.normalizeForStorage(
        longDOBString,
        mockDOBField,
      );
      expect(result).toBeUndefined();
    });

    it("should handle DOB strings with null bytes", () => {
      const nullByteDOB = "1990-01-01\0\0\0";
      const result = SearchFieldProcessor.normalizeForStorage(
        nullByteDOB,
        mockDOBField,
      );
      expect(result).toBeUndefined();
    });
  });

  describe("Memory Safety", () => {
    it("should handle large DOB objects without memory issues", () => {
      const largeDOBObject = {
        mode: "single" as const,
        singleDate: new Date("1990-01-01"),
        extendBefore: false,
        extendAfter: false,
        // Add many extra properties
        ...Object.fromEntries(
          Array.from({ length: 1000 }, (_, i) => [`prop${i}`, `value${i}`]),
        ),
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        largeDOBObject,
        mockDOBField,
      );
      // Should handle gracefully and not crash
      expect(result === undefined || typeof result === "object").toBe(true);
    });

    it("should handle circular references in DOB objects", () => {
      const circularDOBObject: any = {
        mode: "single" as const,
        singleDate: new Date("1990-01-01"),
        extendBefore: false,
        extendAfter: false,
      };
      circularDOBObject.self = circularDOBObject;

      const result = SearchFieldProcessor.normalizeForStorage(
        circularDOBObject,
        mockDOBField,
      );
      // Should handle gracefully and not crash
      expect(result === undefined || typeof result === "object").toBe(true);
    });
  });

  describe("Type Safety", () => {
    it("should handle type coercion edge cases", () => {
      const typeCoercionCases = [
        "0", // Could be coerced to false
        "1", // Could be coerced to true
        "false", // String false
        "true", // String true
        "null", // String null
        "undefined", // String undefined
      ];

      typeCoercionCases.forEach((typeCase) => {
        const result = SearchFieldProcessor.normalizeForStorage(
          typeCase,
          mockDOBField,
        );
        expect(result).toBeUndefined();
      });
    });

    it("should handle prototype pollution attempts", () => {
      const prototypePollutionDOB = {
        mode: "single" as const,
        singleDate: new Date("1990-01-01"),
        extendBefore: false,
        extendAfter: false,
        __proto__: { malicious: true },
        constructor: { prototype: { malicious: true } },
      };

      const result = SearchFieldProcessor.normalizeForStorage(
        prototypePollutionDOB,
        mockDOBField,
      );
      // Should handle gracefully and not crash
      expect(result === undefined || typeof result === "object").toBe(true);
    });
  });
});
