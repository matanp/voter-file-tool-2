import type { MembershipType } from "@prisma/client";
import { parseDistrict } from "./fields";
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

/** The delivered layout has 52 positional fields, whichever separator the export used. */
const BOE_FIELD_COUNT = 52;

/**
 * The Board of Elections delivers this export either tab-delimited (`.txt`) or, after a
 * local conversion, comma-delimited (`.csv`). Both carry the same 52-field layout, so
 * choosing between them is lexical decoding of one known format, not format detection.
 */
const DELIMITERS = ["\t", ","] as const;
type Delimiter = (typeof DELIMITERS)[number];

/** `TOWN/LT/ED-CC-Party`, e.g. `PERINTON/058/014-CC-Democratic`. */
const OFFICE_NAME_PATTERN = /^[^/]+\/\d+\/\d+-CC-.+$/;

const OFFICIAL_TYPES: Record<string, MembershipType> = {
  ELECTED: "PETITIONED",
  APPOINTED: "APPOINTED",
};

const notThisFormat = (reason: string): Error =>
  new Error(`File is not the ${BOE_ELECTED_LIST_FORMAT_ID} format: ${reason}`);

/** Fields are unquoted throughout this format, so a delimiter is always a separator. */
const splitRow = (line: string, delimiter: Delimiter): string[] =>
  line.split(delimiter);

/**
 * Picks the delimiter that decodes the header into the expected layout. Tab is tried
 * first: a tab-delimited header never contains tabs elsewhere, whereas a tab-delimited
 * file can legitimately contain commas inside a name.
 */
const chooseDelimiter = (headerLine: string): Delimiter => {
  const chosen = DELIMITERS.find(
    (delimiter) => splitRow(headerLine, delimiter).length === BOE_FIELD_COUNT,
  );
  if (chosen === undefined) {
    const counts = DELIMITERS.map(
      (delimiter) =>
        `${splitRow(headerLine, delimiter).length} ${delimiter === "\t" ? "tab" : "comma"}-separated`,
    ).join(", ");
    throw notThisFormat(
      `the header row has ${counts} fields, not the ${BOE_FIELD_COUNT} this format expects`,
    );
  }
  return chosen;
};

/** Returns the trimmed field at a 1-based column position. */
const fieldAtPosition = (fields: string[], position: number): string =>
  (fields[position - 1] ?? "").trim();

const BOE_VRCNUM_DIGITS = /^\d{1,9}$/;

/**
 * The voter file stores a nine-digit VRCNUM; this format omits leading zeroes.
 */
const parseBoeVrcnum = (
  raw: string,
): { ok: true; vrcnum: string } | { ok: false; reason: string } => {
  if (!raw) {
    return { ok: false, reason: "Missing VRCNUM" };
  }
  if (!BOE_VRCNUM_DIGITS.test(raw)) {
    return { ok: false, reason: `Invalid VRCNUM: "${raw}"` };
  }
  return { ok: true, vrcnum: raw.padStart(9, "0") };
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

type PhysicalRow = { sourceRow: number; fields: string[] };

/**
 * The shape assertion. Positional reading is only safe when every row has the layout the
 * header has, so a ragged file is refused as a whole rather than read row by row. What
 * each row *says* at those positions is validated per row, so one malformed row becomes
 * a rejection while the rest of the roster survives.
 */
const assertShape = (header: string[], dataRows: PhysicalRow[]): void => {
  if (dataRows.length === 0) {
    throw notThisFormat("it has no data rows");
  }

  const fieldCount = header.length;
  if (fieldCount < HIGHEST_COLUMN_READ) {
    throw notThisFormat(
      `rows have ${fieldCount} fields, fewer than the ${HIGHEST_COLUMN_READ} this format reads`,
    );
  }

  const ragged = dataRows.find(({ fields }) => fields.length !== fieldCount);
  if (ragged) {
    throw notThisFormat(
      `row ${ragged.sourceRow} has ${ragged.fields.length} fields where the header row has ${fieldCount}`,
    );
  }
};

/**
 * Reads the Board of Elections "Elected County Committee List" delimited export delivered
 * for the 2026–2028 term.
 */
export function parseBoeElectedList(fileContents: Buffer): RosterParseResult {
  const lines = fileContents.toString("utf8").replace(/^﻿/, "").split(/\r?\n/);
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const headerLine = lines[0];
  if (headerLine === undefined) {
    throw notThisFormat("it is empty");
  }

  const delimiter = chooseDelimiter(headerLine);
  const header = splitRow(headerLine, delimiter);
  // Row 1 of the file is the header, so the first data row is row 2. Blank physical
  // lines are skipped without renumbering what follows them.
  const dataRows = lines
    .slice(1)
    .map((line, index) => ({ sourceRow: index + 2, line }))
    .filter(({ line }) => line.trim() !== "")
    .map(({ sourceRow, line }) => ({
      sourceRow,
      fields: splitRow(line, delimiter),
    }));
  assertShape(header, dataRows);

  const entries: RosterEntry[] = [];
  const rejected: RejectedRosterRow[] = [];
  let committeeIdentitiesFound = 0;

  for (const { sourceRow, fields } of dataRows) {
    const officeName = fieldAtPosition(fields, COLUMN.officeName);
    const committee = OFFICE_NAME_PATTERN.test(officeName)
      ? parseCommitteeIdentity(officeName)
      : null;
    if (committee) {
      committeeIdentitiesFound += 1;
    }

    const parsedVrcnum = parseBoeVrcnum(fieldAtPosition(fields, COLUMN.vrcnum));
    if (!parsedVrcnum.ok) {
      rejected.push({ sourceRow, reason: parsedVrcnum.reason });
      continue;
    }
    const vrcnum = parsedVrcnum.vrcnum;

    if (!committee) {
      rejected.push({
        sourceRow,
        reason: `Missing or invalid committee identity: office name "${officeName}"`,
      });
      continue;
    }

    const officialType = fieldAtPosition(fields, COLUMN.officialType).toUpperCase();
    const membershipType = OFFICIAL_TYPES[officialType];
    if (!membershipType) {
      rejected.push({
        sourceRow,
        reason: `Unrecognized official type: "${fieldAtPosition(fields, COLUMN.officialType)}"`,
      });
      continue;
    }

    entries.push({
      vrcnum,
      committee,
      claimed: {
        name: fieldAtPosition(fields, COLUMN.name),
        address1: fieldAtPosition(fields, COLUMN.address1),
        city: fieldAtPosition(fields, COLUMN.city),
        state: fieldAtPosition(fields, COLUMN.state),
        zip: fieldAtPosition(fields, COLUMN.zip),
      },
      membershipType,
      sourceRow,
    });
  }

  // A wrong-format read satisfies every structural check above while producing garbage,
  // and the consequence downstream is mass membership removal rather than an error — so a
  // file in which no row carries a committee identity is refused as a whole, not returned
  // as an all-rejected result.
  if (committeeIdentitiesFound === 0) {
    throw notThisFormat(
      `no data row has a committee identity of the form TOWN/LT/ED-CC-Party in column ${COLUMN.officeName}`,
    );
  }

  return { entries, rejected };
}

export const boeElectedListFormat: RosterFormat = {
  label: "Board of Elections elected county committee list (2026–2028 term)",
  status: "current",
  parse: parseBoeElectedList,
};
