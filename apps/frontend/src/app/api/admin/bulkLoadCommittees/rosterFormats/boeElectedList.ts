import type { MembershipType } from "@prisma/client";
import type {
  RejectedRosterRow,
  RosterCommitteeIdentity,
  RosterEntry,
  RosterFormat,
  RosterParseResult,
} from "./types";

export const BOE_ELECTED_LIST_FORMAT_ID = "boe-elected-list";

/**
 * 1-based column positions. The file's header row does not describe its data — column 1 is
 * headed `voter` and holds the VRCNUM, column 2 is headed `id` and holds the full name, and
 * the five declared `res addressN` slots correspond to only two in the data — so this parser
 * reads positions and validates the shape rather than trusting any name.
 */
const COLUMN = {
  vrcnum: 1,
  name: 2,
  address1: 3,
  city: 5,
  state: 6,
  zip: 7,
  officialType: 25,
  officeName: 26,
} as const;

const HIGHEST_COLUMN_READ = Math.max(...Object.values(COLUMN));

/** `TOWN/LT/ED-CC-Party`, e.g. `PERINTON/058/014-CC-Democratic`. */
const OFFICE_NAME_PATTERN = /^[^/]+\/\d+\/\d+-CC-.+$/;

const OFFICIAL_TYPES: Record<string, MembershipType> = {
  ELECTED: "PETITIONED",
  APPOINTED: "APPOINTED",
};

const notThisFormat = (reason: string): Error =>
  new Error(`File is not the ${BOE_ELECTED_LIST_FORMAT_ID} format: ${reason}`);

/** Fields are unquoted throughout this format, so a comma is always a separator. */
const splitRow = (line: string): string[] => line.split(",");

const at = (fields: string[], position: number): string =>
  (fields[position - 1] ?? "").trim();

/** Zero-padded district strings ("006") are base-10 integers, never octal. */
const parseDistrict = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : null;
};

/**
 * Town names arrive uppercase and spelled out for every town including Rochester, so this
 * format needs no equivalent of the workbook format's `LD ` heuristic.
 */
const parseCommitteeIdentity = (
  officeName: string,
): RosterCommitteeIdentity | null => {
  const segments = officeName.split("/");
  if (segments.length !== 3) return null;

  const [town, legDistrictText, electionDistrictText] = segments as [
    string,
    string,
    string,
  ];
  const cityTown = town.trim().toUpperCase();
  const legDistrict = parseDistrict(legDistrictText.trim());
  const electionDistrict = parseDistrict(
    electionDistrictText.replace(/-CC-.*$/, "").trim(),
  );

  if (!cityTown || legDistrict === null || electionDistrict === null) {
    return null;
  }
  return { cityTown, legDistrict, electionDistrict };
};

/**
 * The shape assertion. A wrong-format read of this file satisfies every structural check a
 * header-keyed reader makes while producing garbage, and the consequence downstream is mass
 * membership removal rather than an error — so the file as a whole must prove it is this
 * format before any position is trusted.
 */
const assertShape = (header: string[], dataRows: string[][]): void => {
  if (dataRows.length === 0) {
    throw notThisFormat("it has no data rows");
  }

  const fieldCount = header.length;
  if (fieldCount < HIGHEST_COLUMN_READ) {
    throw notThisFormat(
      `rows have ${fieldCount} fields, fewer than the ${HIGHEST_COLUMN_READ} this format reads`,
    );
  }

  const ragged = dataRows.findIndex((fields) => fields.length !== fieldCount);
  if (ragged !== -1) {
    throw notThisFormat(
      `row ${ragged + 2} has ${dataRows[ragged]!.length} fields where the header row has ${fieldCount}`,
    );
  }

  const misplaced = dataRows.findIndex(
    (fields) => !OFFICE_NAME_PATTERN.test(at(fields, COLUMN.officeName)),
  );
  if (misplaced !== -1) {
    throw notThisFormat(
      `row ${misplaced + 2} column ${COLUMN.officeName} is "${at(dataRows[misplaced]!, COLUMN.officeName)}", not a committee identity of the form TOWN/LT/ED-CC-Party`,
    );
  }
};

/**
 * Reads the Board of Elections "Elected County Committee List" delimited export delivered
 * for the 2026–2028 term.
 */
export function parseBoeElectedList(fileContents: Buffer): RosterParseResult {
  const lines = fileContents
    .toString("utf8")
    .replace(/^﻿/, "")
    .split(/\r?\n/);
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const headerLine = lines[0];
  if (headerLine === undefined) {
    throw notThisFormat("it is empty");
  }

  const header = splitRow(headerLine);
  const dataRows = lines.slice(1).map(splitRow);
  assertShape(header, dataRows);

  const entries: RosterEntry[] = [];
  const rejected: RejectedRosterRow[] = [];

  dataRows.forEach((fields, index) => {
    // Row 1 of the file is the header, so the first data row is row 2.
    const sourceRow = index + 2;

    const vrcnum = at(fields, COLUMN.vrcnum);
    if (!vrcnum) {
      rejected.push({ sourceRow, reason: "Missing VRCNUM" });
      return;
    }

    const officeName = at(fields, COLUMN.officeName);
    const committee = parseCommitteeIdentity(officeName);
    if (!committee) {
      rejected.push({
        sourceRow,
        reason: `Missing or invalid committee identity: office name "${officeName}"`,
      });
      return;
    }

    const officialType = at(fields, COLUMN.officialType).toUpperCase();
    const membershipType = OFFICIAL_TYPES[officialType];
    if (!membershipType) {
      rejected.push({
        sourceRow,
        reason: `Unrecognized official type: "${at(fields, COLUMN.officialType)}"`,
      });
      return;
    }

    entries.push({
      vrcnum,
      committee,
      claimed: {
        name: at(fields, COLUMN.name),
        address1: at(fields, COLUMN.address1),
        city: at(fields, COLUMN.city),
        state: at(fields, COLUMN.state),
        zip: at(fields, COLUMN.zip),
      },
      membershipType,
      sourceRow,
    });
  });

  return { entries, rejected };
}

export const boeElectedListFormat: RosterFormat = {
  label: "Board of Elections elected county committee list (2026–2028 term)",
  status: "current",
  parse: parseBoeElectedList,
};
