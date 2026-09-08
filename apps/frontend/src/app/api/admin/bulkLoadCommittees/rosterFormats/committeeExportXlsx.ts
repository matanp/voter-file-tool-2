import * as xlsx from "xlsx";
import { parseDistrict } from "./fields";
import type {
  RejectedRosterRow,
  RosterEntry,
  RosterFormat,
  RosterParseResult,
} from "./types";

export const COMMITTEE_EXPORT_XLSX_FORMAT_ID = "committee-export-xlsx";

/**
 * Columns that must be declared for a workbook to be this format. The 2026-04-16 export
 * is a strict superset of the 2025-05-15 one — it adds `dob` and the Serve CD/SD/AD/LD
 * breakout — so requiring the shared columns reads both.
 */
const REQUIRED_COLUMNS = [
  "Committee",
  "Serve LT",
  "Serve ED",
  "name",
  "res address1",
  "res city",
  "res state",
  "res zip",
  "voter id",
  "election type",
] as const;

/** `Committee` holds a town name except in the city, where it reads `LD 023`. */
const ROCHESTER_COMMITTEE_MARKER = "LD ";

const ELECTION_TYPE_PREFIXES = [
  { prefix: "Primary Election", membershipType: "PETITIONED" },
  { prefix: "Executive Committee Appointed", membershipType: "APPOINTED" },
] as const;

const cell = (row: Record<string, unknown>, column: string): string => {
  const value = row[column];
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

function readHeader(sheet: xlsx.WorkSheet): string[] {
  const headerRows = xlsx.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    range: 0,
    blankrows: false,
  });
  const header = headerRows[0] ?? [];
  return header.map((value) => (value == null ? "" : String(value).trim()));
}

/**
 * Reads the `Committee` / `Serve LT` / `Serve ED` workbook the county produced for the
 * 2024–2026 term. Archived: it describes a term that is already loaded.
 */
export function parseCommitteeExportXlsx(
  fileContents: Buffer,
): RosterParseResult {
  let workbook: xlsx.WorkBook;
  try {
    workbook = xlsx.read(fileContents);
  } catch (error) {
    throw new Error(
      `File is not the ${COMMITTEE_EXPORT_XLSX_FORMAT_ID} format: it could not be read as a workbook (${String(error)})`,
    );
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) {
    throw new Error(
      `File is not the ${COMMITTEE_EXPORT_XLSX_FORMAT_ID} format: it has no sheets`,
    );
  }

  const header = readHeader(sheet);
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !header.includes(column),
  );
  if (missingColumns.length > 0) {
    throw new Error(
      `File is not the ${COMMITTEE_EXPORT_XLSX_FORMAT_ID} format: missing columns ${missingColumns.join(", ")}`,
    );
  }

  const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const entries: RosterEntry[] = [];
  const rejected: RejectedRosterRow[] = [];

  rows.forEach((row, index) => {
    // Row 1 of the file is the header, so the first data row is row 2.
    const sourceRow = index + 2;

    const vrcnum = cell(row, "voter id");
    if (!vrcnum) {
      rejected.push({ sourceRow, reason: "Missing voter id" });
      return;
    }

    const rawCommittee = cell(row, "Committee");
    const cityTown = rawCommittee.includes(ROCHESTER_COMMITTEE_MARKER)
      ? "ROCHESTER"
      : rawCommittee.toUpperCase();
    const legDistrict = parseDistrict(cell(row, "Serve LT"));
    const electionDistrict = parseDistrict(cell(row, "Serve ED"));

    if (!cityTown || legDistrict === null || electionDistrict === null) {
      rejected.push({
        sourceRow,
        reason: `Missing or invalid committee identity: Committee="${rawCommittee}", Serve LT="${cell(row, "Serve LT")}", Serve ED="${cell(row, "Serve ED")}"`,
      });
      return;
    }

    const electionType = cell(row, "election type");
    const match = ELECTION_TYPE_PREFIXES.find((candidate) =>
      electionType.startsWith(candidate.prefix),
    );
    if (!match) {
      rejected.push({
        sourceRow,
        reason: `Unrecognized election type: "${electionType}"`,
      });
      return;
    }

    entries.push({
      vrcnum,
      committee: { cityTown, legDistrict, electionDistrict },
      claimed: {
        name: cell(row, "name"),
        address1: cell(row, "res address1"),
        city: cell(row, "res city"),
        state: cell(row, "res state"),
        zip: cell(row, "res zip"),
      },
      membershipType: match.membershipType,
      sourceRow,
    });
  });

  return { entries, rejected };
}

export const committeeExportXlsxFormat: RosterFormat = {
  label: "Committee export workbook (2024–2026 term)",
  status: "archived",
  parse: parseCommitteeExportXlsx,
};
