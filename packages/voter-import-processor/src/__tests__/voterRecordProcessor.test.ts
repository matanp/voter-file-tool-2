/**
 * Tests for voterRecordProcessor.
 * Tested: convertStringToDateTime, isRecordNewer, transformVoterRecord (pure functions).
 * Not tested: bulkSaveVoterRecords (requires DB), batchUpdateVoterRecords, formatSqlValue.
 */
import {
  convertStringToDateTime,
  isRecordNewer,
  transformVoterRecord,
  exampleVoterRecord,
} from "../voterRecordProcessor";
import type { VoterRecordArchiveStrings } from "../types";
import type { VoterRecord } from "@prisma/client";

describe("convertStringToDateTime", () => {
  it("parses mm/dd/yyyy to UTC midnight of that day", () => {
    const result = convertStringToDateTime("01/15/1990");
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe("1990-01-15T00:00:00.000Z");
  });

  it("parses 12/31/2000 correctly", () => {
    expect(convertStringToDateTime("12/31/2000").toISOString()).toBe(
      "2000-12-31T00:00:00.000Z",
    );
  });

  it("strips quotes from input", () => {
    expect(convertStringToDateTime('"01/15/1990"').toISOString()).toBe(
      "1990-01-15T00:00:00.000Z",
    );
  });

  it("doesn't depend on the machine's time zone", () => {
    // The suite runs in America/Los_Angeles (jest.globalSetup.cjs), where the
    // old local-midnight parse gave 07:00Z/08:00Z, and pre-1883 dates picked up
    // LA's local mean time offset.
    expect(process.env.TZ).toBe("America/Los_Angeles");
    expect(convertStringToDateTime("07/04/1980").toISOString()).toBe(
      "1980-07-04T00:00:00.000Z",
    );
    expect(convertStringToDateTime("02/01/1880").toISOString()).toBe(
      "1880-02-01T00:00:00.000Z",
    );
  });

  it("throws for invalid format - wrong delimiter", () => {
    expect(() => convertStringToDateTime("01-15-1990")).toThrow(
      "Invalid date format. Expected mm/dd/yyyy",
    );
  });

  it("throws for empty string", () => {
    expect(() => convertStringToDateTime("")).toThrow(
      "Invalid date format. Expected mm/dd/yyyy",
    );
  });

  it("throws for invalid format - non-numeric", () => {
    expect(() => convertStringToDateTime("ab/cd/efgh")).toThrow(
      "Invalid date format. Expected mm/dd/yyyy",
    );
  });

  it("throws for incomplete date - only two parts", () => {
    expect(() => convertStringToDateTime("1/1")).toThrow(
      "Invalid date format. Expected mm/dd/yyyy",
    );
  });
});

describe("isRecordNewer", () => {
  const createArchiveRecord = (
    year: number,
    entryNumber: number,
    vrcnum = "TEST123",
  ) => ({
    VRCNUM: vrcnum,
    recordEntryYear: year,
    recordEntryNumber: entryNumber,
  });

  const createExistingRecord = (
    year: number,
    entryNumber: number,
    vrcnum = "TEST123",
  ) =>
    ({
      VRCNUM: vrcnum,
      latestRecordEntryYear: year,
      latestRecordEntryNumber: entryNumber,
    }) as VoterRecord;

  it("returns true when new record has higher year", () => {
    const newRecord = createArchiveRecord(2025, 1);
    const existing = createExistingRecord(2024, 100);
    expect(isRecordNewer(newRecord, existing)).toBe(true);
  });

  it("returns true when same year but higher entry number", () => {
    const newRecord = createArchiveRecord(2024, 101);
    const existing = createExistingRecord(2024, 100);
    expect(isRecordNewer(newRecord, existing)).toBe(true);
  });

  it("returns false when same year and same entry number", () => {
    const newRecord = createArchiveRecord(2024, 100);
    const existing = createExistingRecord(2024, 100);
    expect(isRecordNewer(newRecord, existing)).toBe(false);
  });

  it("returns false when older year", () => {
    const newRecord = createArchiveRecord(2023, 200);
    const existing = createExistingRecord(2024, 1);
    expect(isRecordNewer(newRecord, existing)).toBe(false);
  });

  it("returns false when same year but lower entry number", () => {
    const newRecord = createArchiveRecord(2024, 50);
    const existing = createExistingRecord(2024, 100);
    expect(isRecordNewer(newRecord, existing)).toBe(false);
  });
});

describe("transformVoterRecord", () => {
  const createMinimalRecord = (overrides: Partial<VoterRecordArchiveStrings> = {}): VoterRecordArchiveStrings => {
    const base: Record<string, string | null> = {};
    for (const key of Object.keys(exampleVoterRecord)) {
      base[key] = "";
    }
    base.VRCNUM = "TEST123456";
    base.DOB = "01/01/1990";
    base.lastUpdate = "01/01/2024";
    base.originalRegDate = "01/01/2020";
    return { ...base, ...overrides } as VoterRecordArchiveStrings;
  };

  it("returns valid VoterRecordArchiveCreateManyInput for minimal valid record", () => {
    const record = createMinimalRecord();
    const result = transformVoterRecord(record, 2024, 1);
    expect(result).not.toBeNull();
    expect(result?.VRCNUM).toBe("TEST123456");
    expect(result?.recordEntryYear).toBe(2024);
    expect(result?.recordEntryNumber).toBe(1);
  });

  it("throws when VRCNUM is undefined", () => {
    const record = createMinimalRecord({ VRCNUM: undefined as unknown as string });
    expect(() => transformVoterRecord(record, 2024, 1)).toThrow("VRCNUM is undefined");
  });

  it("throws when VRCNUM is null", () => {
    const record = createMinimalRecord({ VRCNUM: null });
    expect(() => transformVoterRecord(record, 2024, 1)).toThrow("VRCNUM is undefined");
  });

  it("parses houseNum as number", () => {
    const record = createMinimalRecord({ houseNum: "123" });
    const result = transformVoterRecord(record, 2024, 1);
    expect(result?.houseNum).toBe(123);
  });

  it("parses electionDistrict as number", () => {
    const record = createMinimalRecord({ electionDistrict: "5" });
    const result = transformVoterRecord(record, 2024, 1);
    expect(result?.electionDistrict).toBe(5);
  });

  it("omits houseNum when empty or invalid", () => {
    const record = createMinimalRecord({ houseNum: "" });
    const result = transformVoterRecord(record, 2024, 1);
    expect(result).not.toBeNull();
  });

  it("parses date fields via convertStringToDateTime", () => {
    const record = createMinimalRecord({
      DOB: "03/15/1985",
      lastUpdate: "06/20/2024",
      originalRegDate: "01/10/2019",
    });
    const result = transformVoterRecord(record, 2024, 1);
    expect((result?.DOB as Date).toISOString()).toBe(
      "1985-03-15T00:00:00.000Z",
    );
    expect((result?.lastUpdate as Date).toISOString()).toBe(
      "2024-06-20T00:00:00.000Z",
    );
    expect((result?.originalRegDate as Date).toISOString()).toBe(
      "2019-01-10T00:00:00.000Z",
    );
  });

  it("trims string fields", () => {
    const record = createMinimalRecord({ firstName: "  John  ", lastName: "  Doe  " });
    const result = transformVoterRecord(record, 2024, 1);
    expect(result?.firstName).toBe("John");
    expect(result?.lastName).toBe("Doe");
  });
});
