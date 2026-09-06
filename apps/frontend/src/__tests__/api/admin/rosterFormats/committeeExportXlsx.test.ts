/**
 * The archived `Committee` / `Serve LT` / `Serve ED` workbook parser, proven against
 * genuine excerpts of both real workbooks it has to read.
 */
import * as fs from "fs";
import * as path from "path";
import * as xlsx from "xlsx";
import {
  ROSTER_FORMATS,
  parseWithFormat,
} from "~/app/api/admin/bulkLoadCommittees/rosterFormats";
import type { RosterEntry } from "~/app/api/admin/bulkLoadCommittees/rosterFormats/types";

const FIXTURE_DIR = path.join(__dirname, "../../../fixtures/rosterFormats");

const readFixture = (name: string) => fs.readFileSync(path.join(FIXTURE_DIR, name));

const parse2026 = () =>
  parseWithFormat(
    "committee-export-xlsx",
    readFixture("committee-export-2026-04-16.excerpt.xlsx"),
  );

const parse2025 = () =>
  parseWithFormat(
    "committee-export-xlsx",
    readFixture("committee-export-2025-05-15.excerpt.xlsx"),
  );

const byVrcnum = (entries: RosterEntry[], vrcnum: string) =>
  entries.find((entry) => entry.vrcnum === vrcnum);

/** Build a one-sheet workbook buffer from plain rows, for the malformed-row cases. */
const workbookOf = (rows: Record<string, string>[]): Buffer => {
  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(
    book,
    xlsx.utils.json_to_sheet(rows),
    "Export Current Committee",
  );
  return xlsx.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
};

const VALID_ROW = {
  Committee: "Brighton",
  "Serve LT": "45",
  "Serve ED": "035",
  name: "PAT Q SAMPLE",
  "res address1": "1 MAIN ST",
  "res city": "ROCHESTER",
  "res state": "NY",
  "res zip": "14610",
  "voter id": "000000001",
  "election type": "Primary Election 2024",
};

describe("committee-export-xlsx roster format", () => {
  it("is registered as an archived format", () => {
    expect(ROSTER_FORMATS["committee-export-xlsx"].status).toBe("archived");
  });

  it("reads every row of the 2026-04-16 workbook excerpt", () => {
    const { entries, rejected } = parse2026();

    expect(rejected).toEqual([]);
    expect(entries).toHaveLength(20);
  });

  it("reads every row of the 2025-05-15 workbook excerpt, which the same parser covers", () => {
    const { entries, rejected } = parse2025();

    expect(rejected).toEqual([]);
    expect(entries).toHaveLength(20);
  });

  it("maps a town row to its committee identity, VRCNUM and claimed voter fields", () => {
    const entry = byVrcnum(parse2026().entries, "100089814");

    expect(entry).toEqual({
      vrcnum: "100089814",
      committee: {
        cityTown: "PITTSFORD",
        legDistrict: 59,
        electionDistrict: 12,
      },
      claimed: {
        name: "MAXIMILLIAN J GORDON",
        address1: "3 E JEFFERSON CIR",
        city: "PITTSFORD",
        state: "NY",
        zip: "14534",
      },
      membershipType: "APPOINTED",
      sourceRow: 6,
    });
  });

  it("resolves the Rochester heuristic: a Committee value containing 'LD ' is ROCHESTER", () => {
    const entry = byVrcnum(parse2026().entries, "100387573");

    expect(entry?.committee).toEqual({
      cityTown: "ROCHESTER",
      legDistrict: 23,
      electionDistrict: 6,
    });
  });

  it("uppercases city/town names that arrive in mixed case", () => {
    const entry = byVrcnum(parse2026().entries, "100044299");

    expect(entry?.committee.cityTown).toBe("EAST ROCHESTER");
  });

  it("derives membershipType from each election type value the format uses", () => {
    const { entries } = parse2026();

    expect(byVrcnum(entries, "008671694")).toMatchObject({
      membershipType: "PETITIONED",
    });
    expect(byVrcnum(entries, "100387573")).toMatchObject({
      membershipType: "APPOINTED",
    });
  });

  it("numbers source rows 1-based with the header row as row 1", () => {
    const { entries } = parse2026();

    expect(entries[0]?.sourceRow).toBe(2);
    expect(entries[19]?.sourceRow).toBe(21);
  });

  it("rejects a row with an unrecognized election type without dropping the others", () => {
    const { entries, rejected } = parseWithFormat(
      "committee-export-xlsx",
      workbookOf([
        VALID_ROW,
        {
          ...VALID_ROW,
          "voter id": "000000002",
          "election type": "Appointed by the Chair",
        },
        { ...VALID_ROW, "voter id": "000000003" },
      ]),
    );

    expect(entries.map((entry) => entry.vrcnum)).toEqual([
      "000000001",
      "000000003",
    ]);
    expect(rejected).toEqual([
      {
        sourceRow: 3,
        reason: 'Unrecognized election type: "Appointed by the Chair"',
      },
    ]);
  });

  it("rejects a row missing committee identity without dropping the others", () => {
    const { entries, rejected } = parseWithFormat(
      "committee-export-xlsx",
      workbookOf([
        VALID_ROW,
        { ...VALID_ROW, "voter id": "000000002", Committee: "" },
        { ...VALID_ROW, "voter id": "000000003", "Serve ED": "" },
      ]),
    );

    expect(entries.map((entry) => entry.vrcnum)).toEqual(["000000001"]);
    expect(rejected.map((row) => row.sourceRow)).toEqual([3, 4]);
    expect(rejected[0]?.reason).toMatch(/committee identity/i);
    expect(rejected[1]?.reason).toMatch(/committee identity/i);
  });

  it("rejects a row with no voter id", () => {
    const { entries, rejected } = parseWithFormat(
      "committee-export-xlsx",
      workbookOf([{ ...VALID_ROW, "voter id": "" }]),
    );

    expect(entries).toEqual([]);
    expect(rejected).toEqual([{ sourceRow: 2, reason: "Missing voter id" }]);
  });

  it("throws on a file that is not this format rather than producing entries", () => {
    expect(() =>
      parseWithFormat(
        "committee-export-xlsx",
        readFixture("boe-elected-list-2026-2028.excerpt.csv"),
      ),
    ).toThrow(/committee-export-xlsx/);
  });

  it("throws on a workbook whose columns belong to another format", () => {
    expect(() =>
      parseWithFormat(
        "committee-export-xlsx",
        workbookOf([
          {
            "LT Description": "City LD 07",
            LT: "07",
            ED: "002",
            "voter id": "008846966",
            name: "DONNA J BOUR-PURDY",
            Add1: "675 BEACH AVE",
            City: "ROCHESTER",
            "res state": "NY",
            Zip: "14612",
            "Pet-Apt": "Petition",
          },
        ]),
      ),
    ).toThrow(/committee-export-xlsx/);
  });
});
