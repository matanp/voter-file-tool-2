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
  it("parses valid mm/dd/yyyy format", () => {
    const result = convertStringToDateTime("01/15/1990");
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(1990);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
  });

  it("parses 12/31/2000 correctly", () => {
    const result = convertStringToDateTime("12/31/2000");
    expect(result.getFullYear()).toBe(2000);
    expect(result.getMonth()).toBe(11);
    expect(result.getDate()).toBe(31);
  });

  it("strips quotes from input", () => {
    const result = convertStringToDateTime('"01/15/1990"');
    expect(result.getFullYear()).toBe(1990);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(15);
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
    const dob = result?.DOB;
    expect(dob).toBeInstanceOf(Date);
    expect((dob as Date).getFullYear()).toBe(1985);
    expect((dob as Date).getMonth()).toBe(2);
    expect((dob as Date).getDate()).toBe(15);
  });

  it("trims string fields", () => {
    const record = createMinimalRecord({ firstName: "  John  ", lastName: "  Doe  " });
    const result = transformVoterRecord(record, 2024, 1);
    expect(result?.firstName).toBe("John");
    expect(result?.lastName).toBe("Doe");
  });
});
