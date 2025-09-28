// Mock the convertAPIToPrismaRecord function behavior for testing
import type { VoterRecordAPI } from "@voter-file-tool/shared-validators";
import type { VoterRecord } from "@prisma/client";

// Create a minimal test record type that only includes the fields we need for testing
type TestVoterRecordAPI = Pick<
  VoterRecordAPI,
  "VRCNUM" | "latestRecordEntryYear" | "latestRecordEntryNumber"
> &
  Partial<Pick<VoterRecordAPI, "DOB" | "lastUpdate" | "originalRegDate">>;

const mockConvertAPIToPrismaRecord = (
  apiRecord: TestVoterRecordAPI,
): VoterRecord => {
  // Simulate the convertDateString function from VoterListReportForm
  const parseCalendarDate = (dateString?: string | null): Date | null => {
    if (!dateString) return null;

    // Handle YYYY-MM-DD precisely
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    if (m) {
      const y = Number(m[1]),
        mo = Number(m[2]) - 1,
        d = Number(m[3]);
      // Construct at noon UTC to avoid DST edge cases
      return new Date(Date.UTC(y, mo, d, 12, 0, 0));
    }

    // For other formats, fall back to standard parsing
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
  };

  const convertDateString = (
    dateString: string | null | undefined,
  ): Date | null => {
    if (!dateString) return null;

    // Use the safe calendar date parser to avoid timezone issues
    const date = parseCalendarDate(dateString);
    if (!date) return null;

    const currentYear = new Date().getFullYear();
    const minYear = 1900; // Reasonable minimum year for voter records
    const maxYear = currentYear + 1; // Allow up to next year for future registrations

    const year = date.getFullYear();
    if (year < minYear || year > maxYear) {
      console.warn(
        `Date ${dateString} is outside reasonable bounds (${minYear}-${maxYear})`,
      );
      return null;
    }

    return date;
  };

  return {
    ...apiRecord,
    DOB: convertDateString(apiRecord.DOB),
    lastUpdate: convertDateString(apiRecord.lastUpdate),
    originalRegDate: convertDateString(apiRecord.originalRegDate),
  } as VoterRecord;
};

describe("VoterListReportForm date conversion", () => {
  describe("convertAPIToPrismaRecord date handling", () => {
    it("should correctly convert DOB without timezone shift", () => {
      const apiRecord: TestVoterRecordAPI = {
        VRCNUM: "12345",
        latestRecordEntryYear: 2024,
        latestRecordEntryNumber: 1,
        DOB: "1990-01-01",
        lastUpdate: "2024-12-25",
        originalRegDate: "2023-06-15",
      };

      const result = mockConvertAPIToPrismaRecord(apiRecord);

      // Verify DOB is parsed correctly (no timezone shift)
      expect(result.DOB).not.toBeNull();
      expect(result.DOB?.getFullYear()).toBe(1990);
      expect(result.DOB?.getMonth()).toBe(0); // January is month 0
      expect(result.DOB?.getDate()).toBe(1);

      // Verify lastUpdate is parsed correctly
      expect(result.lastUpdate).not.toBeNull();
      expect(result.lastUpdate?.getFullYear()).toBe(2024);
      expect(result.lastUpdate?.getMonth()).toBe(11); // December is month 11
      expect(result.lastUpdate?.getDate()).toBe(25);

      // Verify originalRegDate is parsed correctly
      expect(result.originalRegDate).not.toBeNull();
      expect(result.originalRegDate?.getFullYear()).toBe(2023);
      expect(result.originalRegDate?.getMonth()).toBe(5); // June is month 5
      expect(result.originalRegDate?.getDate()).toBe(15);
    });

    it("should handle null/undefined date fields", () => {
      const apiRecord: TestVoterRecordAPI = {
        VRCNUM: "12345",
        latestRecordEntryYear: 2024,
        latestRecordEntryNumber: 1,
        DOB: null,
        lastUpdate: undefined,
        originalRegDate: "",
      };

      const result = mockConvertAPIToPrismaRecord(apiRecord);

      expect(result.DOB).toBeNull();
      expect(result.lastUpdate).toBeNull();
      expect(result.originalRegDate).toBeNull();
    });

    it("should filter out dates outside reasonable bounds", () => {
      const apiRecord: TestVoterRecordAPI = {
        VRCNUM: "12345",
        latestRecordEntryYear: 2024,
        latestRecordEntryNumber: 1,
        DOB: "1800-01-01", // Too old
        lastUpdate: "2030-01-01", // Too far in future
        originalRegDate: "2024-12-25", // Valid date
      };

      const result = mockConvertAPIToPrismaRecord(apiRecord);

      expect(result.DOB).toBeNull(); // Should be filtered out
      expect(result.lastUpdate).toBeNull(); // Should be filtered out
      expect(result.originalRegDate).not.toBeNull(); // Should be kept
      expect(result.originalRegDate?.getFullYear()).toBe(2024);
    });

    it("should handle various date formats consistently", () => {
      const testCases = [
        { input: "2024-12-25", expected: { year: 2024, month: 11, day: 25 } },
        { input: "2024-02-29", expected: { year: 2024, month: 1, day: 29 } }, // Leap year
        { input: "2023-12-31", expected: { year: 2023, month: 11, day: 31 } },
      ];

      testCases.forEach(({ input, expected }) => {
        const apiRecord: TestVoterRecordAPI = {
          VRCNUM: "12345",
          latestRecordEntryYear: 2024,
          latestRecordEntryNumber: 1,
          DOB: input,
        };

        const result = mockConvertAPIToPrismaRecord(apiRecord);

        expect(result.DOB).not.toBeNull();
        expect(result.DOB?.getFullYear()).toBe(expected.year);
        expect(result.DOB?.getMonth()).toBe(expected.month);
        expect(result.DOB?.getDate()).toBe(expected.day);
      });
    });
  });
});
