import { parseCalendarDate } from "~/lib/dateUtils";

describe("parseCalendarDate", () => {
  describe("YYYY-MM-DD format parsing", () => {
    it("should parse calendar dates correctly without timezone shift", () => {
      // Test various dates to ensure they parse to the correct calendar date
      const testCases = [
        { input: "1990-01-01", expected: { year: 1990, month: 0, day: 1 } },
        { input: "2024-12-25", expected: { year: 2024, month: 11, day: 25 } },
        { input: "2024-06-15", expected: { year: 2024, month: 5, day: 15 } },
        { input: "2023-02-28", expected: { year: 2023, month: 1, day: 28 } },
        { input: "2024-02-29", expected: { year: 2024, month: 1, day: 29 } }, // Leap year
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parseCalendarDate(input);
        expect(result).not.toBeNull();
        expect(result?.getFullYear()).toBe(expected.year);
        expect(result?.getMonth()).toBe(expected.month); // getMonth() is 0-indexed
        expect(result?.getDate()).toBe(expected.day);
      });
    });

    it("should handle edge cases correctly", () => {
      // Test leap year edge case
      expect(parseCalendarDate("2024-02-29")?.getDate()).toBe(29);

      // Test invalid date rollover (JavaScript behavior)
      expect(parseCalendarDate("2023-02-29")?.getDate()).toBe(1); // Rolls over to March 1st

      // Test null/undefined inputs
      expect(parseCalendarDate(null)).toBeNull();
      expect(parseCalendarDate(undefined)).toBeNull();
      expect(parseCalendarDate("")).toBeNull();

      // Test invalid format
      expect(parseCalendarDate("invalid-date")).toBeNull();
    });

    it("should handle non-YYYY-MM-DD formats using standard parsing", () => {
      // These should fall back to standard Date parsing
      const result1 = parseCalendarDate("2024-12-25T10:30:00Z");
      expect(result1).not.toBeNull();

      const result2 = parseCalendarDate("Dec 25, 2024");
      expect(result2).not.toBeNull();

      const result3 = parseCalendarDate("12/25/2024");
      expect(result3).not.toBeNull();
    });
  });

  describe("timezone consistency", () => {
    it("should produce consistent results regardless of local timezone", () => {
      // This test ensures that YYYY-MM-DD dates are parsed consistently
      // regardless of the user's timezone setting
      const testDate = "2024-12-25";
      const result = parseCalendarDate(testDate);

      // The key assertion: the date components should match the input string
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(11); // December is month 11
      expect(result?.getDate()).toBe(25);

      // Additional check: ensure it's constructed at noon UTC
      expect(result?.getUTCHours()).toBe(12);
      expect(result?.getUTCMinutes()).toBe(0);
      expect(result?.getUTCSeconds()).toBe(0);
    });
  });
});
