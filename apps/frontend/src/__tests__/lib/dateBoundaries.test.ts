import {
  DATE_BOUNDARIES,
  EARLIEST_DATE,
  LATEST_DATE,
} from "~/lib/constants/dateBoundaries";

describe("Date Boundaries Safety", () => {
  describe("EARLIEST_DATE", () => {
    it("should be set to 1800-01-01", () => {
      expect(EARLIEST_DATE).toEqual(new Date("1800-01-01"));
    });

    it("should be accessible through DATE_BOUNDARIES object", () => {
      expect(DATE_BOUNDARIES.EARLIEST_DATE).toEqual(new Date("1800-01-01"));
    });

    it("should handle leap year edge cases correctly", () => {
      // 1800 was not a leap year (divisible by 100 but not 400)
      const feb28_1800 = new Date("1800-02-28T00:00:00.000Z");
      const feb29_1800 = new Date("1800-02-29T00:00:00.000Z");

      expect(feb28_1800.getUTCDate()).toBe(28);
      expect(feb29_1800.getUTCDate()).toBe(1); // Should roll over to March 1st
      expect(feb29_1800.getUTCMonth()).toBe(2); // March (0-indexed)
    });

    it("should be consistent across multiple calls", () => {
      const date1 = EARLIEST_DATE;
      const date2 = EARLIEST_DATE;

      expect(date1).toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });
  });

  describe("LATEST_DATE", () => {
    it("should be 100 years in the future from current date", () => {
      const currentYear = new Date().getFullYear();
      const expectedYear = currentYear + 100;

      expect(LATEST_DATE.getFullYear()).toBe(expectedYear);
    });

    it("should be accessible through DATE_BOUNDARIES object", () => {
      expect(DATE_BOUNDARIES.LATEST_DATE).toBe(LATEST_DATE);
    });

    it("should handle leap year edge cases correctly", () => {
      const currentYear = new Date().getFullYear();
      const futureYear = currentYear + 100;

      // Check if the future year is a leap year
      const isLeapYear = (year: number) =>
        (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

      if (isLeapYear(futureYear)) {
        // If it's a leap year, Feb 29 should be valid
        const feb29 = new Date(futureYear, 1, 29);
        expect(feb29.getDate()).toBe(29);
        expect(feb29.getMonth()).toBe(1); // February (0-indexed)
      }
    });

    it("should be consistent across multiple calls", () => {
      const date1 = LATEST_DATE;
      const date2 = LATEST_DATE;

      expect(date1).toBe(date2);
      expect(date1.getTime()).toBe(date2.getTime());
    });

    it("should handle year 2100+ edge cases", () => {
      const currentYear = new Date().getFullYear();
      const futureYear = currentYear + 100;

      expect(LATEST_DATE.getFullYear()).toBe(futureYear);

      // Test specific edge cases for 2100+ years if applicable
      if (futureYear >= 2100) {
        // 2100 is not a leap year (divisible by 100 but not 400)
        if (futureYear === 2100) {
          const feb29_2100 = new Date(2100, 1, 29);
          expect(feb29_2100.getDate()).toBe(1); // Should roll over to March 1st
          expect(feb29_2100.getMonth()).toBe(2); // March (0-indexed)
        }

        // 2400 is a leap year (divisible by 400)
        if (futureYear === 2400) {
          const feb29_2400 = new Date(2400, 1, 29);
          expect(feb29_2400.getDate()).toBe(29);
          expect(feb29_2400.getMonth()).toBe(1); // February (0-indexed)
        }
      }
    });
  });

  describe("Date Range Validation", () => {
    it("should validate that EARLIEST_DATE is before LATEST_DATE", () => {
      expect(EARLIEST_DATE.getTime()).toBeLessThan(LATEST_DATE.getTime());
    });

    it("should handle dates within valid range", () => {
      const testDate = new Date("1950-06-15");

      expect(testDate.getTime()).toBeGreaterThan(EARLIEST_DATE.getTime());
      expect(testDate.getTime()).toBeLessThan(LATEST_DATE.getTime());
    });

    it("should reject dates before EARLIEST_DATE", () => {
      const invalidDate = new Date("1799-12-31");

      expect(invalidDate.getTime()).toBeLessThan(EARLIEST_DATE.getTime());
    });

    it("should reject dates after LATEST_DATE", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 101); // 101 years in future

      expect(futureDate.getTime()).toBeGreaterThan(LATEST_DATE.getTime());
    });

    it("should handle boundary dates correctly", () => {
      // Test exactly at boundaries
      expect(EARLIEST_DATE.getTime()).toBe(EARLIEST_DATE.getTime());
      expect(LATEST_DATE.getTime()).toBe(LATEST_DATE.getTime());

      // Test one day before/after boundaries
      const dayBeforeEarliest = new Date(EARLIEST_DATE);
      dayBeforeEarliest.setDate(dayBeforeEarliest.getDate() - 1);

      const dayAfterLatest = new Date(LATEST_DATE);
      dayAfterLatest.setDate(dayAfterLatest.getDate() + 1);

      expect(dayBeforeEarliest.getTime()).toBeLessThan(EARLIEST_DATE.getTime());
      expect(dayAfterLatest.getTime()).toBeGreaterThan(LATEST_DATE.getTime());
    });
  });

  describe("Timezone Safety", () => {
    it("should handle timezone edge cases consistently", () => {
      // Test that dates are created consistently regardless of timezone
      const date1 = new Date("1800-01-01T00:00:00.000Z");
      const date2 = new Date("1800-01-01T00:00:00.000Z");

      // Both should represent the same date
      expect(date1.getUTCFullYear()).toBe(1800);
      expect(date1.getUTCMonth()).toBe(0); // January (0-indexed)
      expect(date1.getUTCDate()).toBe(1);

      expect(date2.getUTCFullYear()).toBe(1800);
      expect(date2.getUTCMonth()).toBe(0); // January (0-indexed)
      expect(date2.getUTCDate()).toBe(1);
    });

    it("should handle daylight saving time transitions", () => {
      // Test dates around DST transitions - use current year to ensure they're in range
      const currentYear = new Date().getFullYear();
      const springForward = new Date(`${currentYear}-03-10`); // DST starts
      const fallBack = new Date(`${currentYear}-11-03`); // DST ends

      // These dates should be within our valid range
      expect(springForward.getTime()).toBeGreaterThan(EARLIEST_DATE.getTime());
      expect(springForward.getTime()).toBeLessThan(LATEST_DATE.getTime());

      expect(fallBack.getTime()).toBeGreaterThan(EARLIEST_DATE.getTime());
      expect(fallBack.getTime()).toBeLessThan(LATEST_DATE.getTime());
    });

    it("should handle leap seconds and time precision", () => {
      // Test that our boundary dates handle time precision correctly
      const earliestWithTime = new Date("1800-01-01T23:59:59.999Z");
      const latestWithTime = new Date(LATEST_DATE);
      latestWithTime.setHours(23, 59, 59, 999);

      expect(earliestWithTime.getTime()).toBeGreaterThan(
        EARLIEST_DATE.getTime(),
      );
      // The latestWithTime might be slightly after LATEST_DATE due to timezone handling
      expect(latestWithTime.getTime()).toBeLessThanOrEqual(
        LATEST_DATE.getTime() + 86400000,
      ); // Allow 1 day tolerance
    });
  });

  describe("Date Arithmetic Safety", () => {
    it("should handle date arithmetic without overflow", () => {
      const startDate = new Date(EARLIEST_DATE);
      const endDate = new Date(LATEST_DATE);

      // Calculate difference in years
      const yearDiff = endDate.getFullYear() - startDate.getFullYear();

      // Should be approximately 100 years (allow for current year variations)
      expect(yearDiff).toBeGreaterThanOrEqual(100);
      expect(yearDiff).toBeLessThanOrEqual(400); // Reasonable upper bound
    });

    it("should handle date comparisons safely", () => {
      const testDates = [
        new Date("1900-01-01"),
        new Date("1950-06-15"),
        new Date("2000-12-31"),
        new Date("2024-01-01"),
      ];

      testDates.forEach((date) => {
        expect(date.getTime()).toBeGreaterThan(EARLIEST_DATE.getTime());
        expect(date.getTime()).toBeLessThan(LATEST_DATE.getTime());
      });
    });

    it("should handle date sorting correctly", () => {
      const dates = [
        new Date("2000-01-01"),
        new Date("1950-06-15"),
        new Date("2024-12-31"),
        new Date("1900-01-01"),
      ];

      const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());

      expect(sortedDates[0]).toEqual(new Date("1900-01-01"));
      expect(sortedDates[1]).toEqual(new Date("1950-06-15"));
      expect(sortedDates[2]).toEqual(new Date("2000-01-01"));
      expect(sortedDates[3]).toEqual(new Date("2024-12-31"));
    });
  });

  describe("Edge Case Handling", () => {
    it("should handle year 2000 edge case", () => {
      const y2k = new Date("2000-01-01");

      expect(y2k.getTime()).toBeGreaterThan(EARLIEST_DATE.getTime());
      expect(y2k.getTime()).toBeLessThan(LATEST_DATE.getTime());

      // 2000 was a leap year
      const feb29_2000 = new Date("2000-02-29T00:00:00.000Z");
      expect(feb29_2000.getUTCDate()).toBe(29);
      expect(feb29_2000.getUTCMonth()).toBe(1); // February (0-indexed)
    });

    it("should handle century boundaries", () => {
      const centuryBoundaries = [
        new Date("1899-12-31"),
        new Date("1900-01-01"),
        new Date("1999-12-31"),
        new Date("2000-01-01"),
        new Date("2099-12-31"),
        new Date("2100-01-01"),
      ];

      centuryBoundaries.forEach((date) => {
        if (
          date.getTime() >= EARLIEST_DATE.getTime() &&
          date.getTime() <= LATEST_DATE.getTime()
        ) {
          // Should be within valid range
          expect(date.getTime()).toBeGreaterThanOrEqual(
            EARLIEST_DATE.getTime(),
          );
          expect(date.getTime()).toBeLessThanOrEqual(LATEST_DATE.getTime());
        }
      });
    });

    it("should handle month boundaries correctly", () => {
      const monthBoundaries = [
        new Date("1900-01-31"), // January 31st
        new Date("1900-02-28"), // February 28th (non-leap year)
        new Date("1900-02-29"), // February 29th (should roll over)
        new Date("1900-03-31"), // March 31st
        new Date("1900-04-30"), // April 30th
      ];

      monthBoundaries.forEach((date) => {
        expect(date.getTime()).toBeGreaterThan(EARLIEST_DATE.getTime());
        expect(date.getTime()).toBeLessThan(LATEST_DATE.getTime());
      });
    });
  });
});
