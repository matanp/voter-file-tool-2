/**
 * Regenerates the committed roster-parser fixtures by excerpting the real files.
 *
 * The fixtures are genuine excerpts: the original header row plus a selection of real
 * data rows, cells copied verbatim. The source files live in the (gitignored) local data
 * directory and are not committed; this script records how the fixtures were made.
 *
 * Usage (from apps/frontend): pnpm exec tsx scripts/makeRosterFixtures.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as xlsx from "xlsx";

const FIXTURE_DIR = path.join("src", "__tests__", "fixtures", "rosterFormats");

type SourceRow = { row: Record<string, unknown>; sheetRow: number };

/** Copy the header row plus the chosen data rows into a new single-sheet workbook. */
function excerptWorkbook(
  sourcePath: string,
  outputPath: string,
  pickRows: (rows: SourceRow[]) => SourceRow[],
): void {
  const workbook = xlsx.read(fs.readFileSync(sourcePath));
  const sheetName = workbook.SheetNames[0]!;
  const sheet = workbook.Sheets[sheetName]!;
  const range = xlsx.utils.decode_range(sheet["!ref"]!);

  const rows = pickRows(
    xlsx.utils
      .sheet_to_json<Record<string, unknown>>(sheet)
      .map((row, index) => ({ row, sheetRow: range.s.r + 1 + index })),
  );

  const outSheet: xlsx.WorkSheet = {};
  const copyRow = (fromRow: number, toRow: number) => {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const from = xlsx.utils.encode_cell({ r: fromRow, c: col });
      const cell: unknown = sheet[from];
      if (!cell) continue;
      outSheet[xlsx.utils.encode_cell({ r: toRow, c: col })] = cell;
    }
  };

  copyRow(range.s.r, 0);
  rows.forEach(({ sheetRow }, index) => copyRow(sheetRow, index + 1));
  outSheet["!ref"] = xlsx.utils.encode_range({
    s: { r: 0, c: range.s.c },
    e: { r: rows.length, c: range.e.c },
  });

  const outBook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(outBook, outSheet, sheetName);
  xlsx.writeFile(outBook, outputPath);
  console.log(`${outputPath}: ${rows.length} rows from ${sourcePath}`);
}

/** Take a spread of committees plus both `election type` values. */
function pickSpread(limit: number) {
  return (rows: SourceRow[]): SourceRow[] => {
    const picked: SourceRow[] = [];
    const seenCommittees = new Set<string>();
    const wanted = ["Primary Election", "Executive Committee Appointed"];

    for (const want of wanted) {
      const match = rows.find((candidate) =>
        String(candidate.row["election type"] ?? "").startsWith(want),
      );
      if (match) picked.push(match);
    }

    for (const candidate of rows) {
      if (picked.length >= limit) break;
      if (picked.includes(candidate)) continue;
      const committee = String(candidate.row.Committee ?? "");
      const key = committee.includes("LD ") ? "LD" : committee;
      if (seenCommittees.has(key)) continue;
      seenCommittees.add(key);
      picked.push(candidate);
    }

    return picked.slice(0, limit).sort((a, b) => a.sheetRow - b.sheetRow);
  };
}

fs.mkdirSync(FIXTURE_DIR, { recursive: true });

excerptWorkbook(
  path.join("data", "Committee File 2026-04-16(1).xlsx"),
  path.join(FIXTURE_DIR, "committee-export-2026-04-16.excerpt.xlsx"),
  pickSpread(20),
);

excerptWorkbook(
  path.join("data", "Committee-File-2025-05-15.xlsx"),
  path.join(FIXTURE_DIR, "committee-export-2025-05-15.excerpt.xlsx"),
  pickSpread(20),
);

// The Board of Elections list is a plain delimited file; excerpt it by line so the
// header row, delimiter and padding survive byte for byte.
const boeSource = path.join(
  "data",
  "Elected County Committee List 2026 - 2028 .csv",
);
const boeOutput = path.join(
  FIXTURE_DIR,
  "boe-elected-list-2026-2028.excerpt.csv",
);
const boeLines = fs.readFileSync(boeSource, "utf8").split(/\r?\n/);
fs.writeFileSync(boeOutput, boeLines.slice(0, 21).join("\n") + "\n");
console.log(`${boeOutput}: 20 rows from ${boeSource}`);
