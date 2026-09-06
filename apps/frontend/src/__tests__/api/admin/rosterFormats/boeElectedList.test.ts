/**
 * The Board of Elections "Elected County Committee List" parser, proven against a fixture
 * that reproduces the delivered file's shape with invented people in it.
 *
 * This file's header row does not describe its data rows, so every assertion here is about
 * reading by column position and refusing files whose shape does not match.
 */
import * as fs from "fs";
import * as path from "path";
import {
  ROSTER_FORMATS,
  parseWithFormat,
} from "~/app/api/admin/bulkLoadCommittees/rosterFormats";
import type { RosterEntry } from "~/app/api/admin/bulkLoadCommittees/rosterFormats/types";

const FIXTURE_DIR = path.join(__dirname, "../../../fixtures/rosterFormats");
const BOE_FIXTURE = "boe-elected-list-2026-2028.excerpt.csv";

const readFixture = (name: string) =>
  fs.readFileSync(path.join(FIXTURE_DIR, name));

const fixtureLines = (): string[] =>
  readFixture(BOE_FIXTURE)
    .toString("utf8")
    .split("\n")
    .filter((line) => line !== "");

const parseFixture = () => parseWithFormat("boe-elected-list", readFixture(BOE_FIXTURE));

const byVrcnum = (entries: RosterEntry[], vrcnum: string) =>
  entries.find((entry) => entry.vrcnum === vrcnum);

/** How the current importer reads a file: by the name the header row declares. */
const readByHeaderName = (line: string, column: string): string => {
  const header = fixtureLines()[0]!.split(",");
  const index = header.indexOf(column);
  return (line.split(",")[index] ?? "").trim();
};

/**
 * A data row of the delivered shape: 52 comma-separated fields, no quoting, with the
 * positions this parser reads filled in.
 */
const dataRow = (fields: Partial<Record<number, string>>): string => {
  const row = new Array<string>(52).fill("");
  const withDefaults: Record<number, string> = {
    1: "000000001",
    2: "PAT Q SAMPLE ",
    3: "1 MAIN ST",
    5: "BRIGHTON",
    6: "NY",
    7: "14610",
    25: "ELECTED",
    26: "BRIGHTON/045/008-CC-Democratic",
    ...fields,
  };
  for (const [position, value] of Object.entries(withDefaults)) {
    row[Number(position) - 1] = value;
  }
  return row.join(",");
};

/** A file built from the real header row plus the given data rows. */
const csvOf = (rows: string[]): Buffer =>
  Buffer.from([fixtureLines()[0]!, ...rows].join("\n") + "\n", "utf8");

describe("boe-elected-list roster format", () => {
  it("is registered as a current format", () => {
    expect(ROSTER_FORMATS["boe-elected-list"].status).toBe("current");
  });

  it("reads every row of the delivered file excerpt with no rejections", () => {
    const { entries, rejected } = parseFixture();

    expect(rejected).toEqual([]);
    expect(entries).toHaveLength(fixtureLines().length - 1);
  });

  it("maps a row to its VRCNUM, committee identity, claimed voter fields and membership type", () => {
    const entry = byVrcnum(parseFixture().entries, "4100011");

    expect(entry).toEqual({
      vrcnum: "4100011",
      committee: {
        cityTown: "PERINTON",
        legDistrict: 58,
        electionDistrict: 14,
      },
      claimed: {
        name: "AVERY C LINDHOLM",
        address1: "1 BRIARWOOD CIR",
        city: "FAIRPORT",
        state: "NY",
        zip: "14450",
      },
      membershipType: "PETITIONED",
      sourceRow: 2,
    });
  });

  it("parses zero-padded district segments of the office name as base-10 integers", () => {
    const entry = byVrcnum(parseFixture().entries, "41811244");

    // MENDON/054/001-CC-Democratic — "054" and "001" are decimal, never octal.
    expect(entry?.committee).toEqual({
      cityTown: "MENDON",
      legDistrict: 54,
      electionDistrict: 1,
    });
  });

  it("reads a ROCHESTER committee through the ordinary path, with no special case", () => {
    const entry = byVrcnum(parseFixture().entries, "900012345");

    expect(entry?.committee).toEqual({
      cityTown: "ROCHESTER",
      legDistrict: 25,
      electionDistrict: 14,
    });
  });

  it("numbers source rows 1-based with the header row as row 1", () => {
    const { entries } = parseFixture();

    expect(entries[0]?.sourceRow).toBe(2);
    expect(entries.at(-1)?.sourceRow).toBe(fixtureLines().length);
  });

  it("maps the official type ELECTED to PETITIONED for every delivered row", () => {
    const { entries } = parseFixture();

    expect(
      entries.every((entry) => entry.membershipType === "PETITIONED"),
    ).toBe(true);
  });

  it("maps an appointed official type to APPOINTED", () => {
    const { entries, rejected } = parseWithFormat(
      "boe-elected-list",
      csvOf([dataRow({ 25: "APPOINTED" })]),
    );

    expect(rejected).toEqual([]);
    expect(entries[0]?.membershipType).toBe("APPOINTED");
  });

  it("rejects a row with an unrecognized official type, with its row number, leaving the others intact", () => {
    const { entries, rejected } = parseWithFormat(
      "boe-elected-list",
      csvOf([
        dataRow({ 1: "000000001" }),
        dataRow({ 1: "000000002", 25: "SUBSTITUTED" }),
        dataRow({ 1: "000000003" }),
      ]),
    );

    expect(entries.map((entry) => entry.vrcnum)).toEqual([
      "000000001",
      "000000003",
    ]);
    expect(rejected).toEqual([
      { sourceRow: 3, reason: 'Unrecognized official type: "SUBSTITUTED"' },
    ]);
  });

  it("rejects a row with no VRCNUM rather than throwing", () => {
    const { entries, rejected } = parseWithFormat(
      "boe-elected-list",
      csvOf([dataRow({ 1: "" })]),
    );

    expect(entries).toEqual([]);
    expect(rejected).toEqual([{ sourceRow: 2, reason: "Missing VRCNUM" }]);
  });

  it("throws on a file of the archived workbook format submitted under this identifier", () => {
    expect(() =>
      parseWithFormat(
        "boe-elected-list",
        readFixture("committee-export-2026-04-16.excerpt.xlsx"),
      ),
    ).toThrow(/boe-elected-list/);
  });

  it("throws on a ragged file whose rows do not share a uniform field count", () => {
    expect(() =>
      parseWithFormat(
        "boe-elected-list",
        csvOf([dataRow({}), dataRow({}) + ",extra"]),
      ),
    ).toThrow(/boe-elected-list/);
  });

  it("does not accept a file on the strength of its header row alone", () => {
    // Header names exactly as the delivered file declares them — `voter`, `id`, `name`,
    // `res address1`, … — over data rows belonging to another format. The field count is
    // uniform, so only reading position 26 catches it. Header names are never evidence.
    const otherFormatRow = new Array<string>(52).fill("");
    [
      "400846966",
      "MORGAN J HALLORAN",
      "675 BAYSIDE AVE",
      "ROCHESTER",
      "NY",
      "14612",
      "Petition",
    ].forEach((value, index) => {
      otherFormatRow[index] = value;
    });

    expect(() =>
      parseWithFormat("boe-elected-list", csvOf([otherFormatRow.join(",")])),
    ).toThrow(/boe-elected-list/);
  });

  it("throws when a data row's office name is not a committee identity, even under the expected header", () => {
    expect(() =>
      parseWithFormat(
        "boe-elected-list",
        csvOf([dataRow({ 26: "COUNTY LEGISLATOR" })]),
      ),
    ).toThrow(/boe-elected-list/);
  });

  it("reads name and city by position, where a header-keyed read yields an address and an empty city", () => {
    const firstDataRow = fixtureLines()[1]!;

    // What the importer would have read from this row before this parser existed:
    expect(readByHeaderName(firstDataRow, "name")).toBe("1 BRIARWOOD CIR");
    expect(readByHeaderName(firstDataRow, "res city")).toBe("");

    const entry = parseFixture().entries[0];

    // What position-reading actually yields — a person, and the town they live in.
    expect(entry?.claimed.name).toBe("AVERY C LINDHOLM");
    expect(entry?.claimed.city).toBe("FAIRPORT");
    expect(entry?.claimed.name).not.toBe(readByHeaderName(firstDataRow, "name"));
    expect(entry?.claimed.city).not.toBe(
      readByHeaderName(firstDataRow, "res city"),
    );
  });
});
