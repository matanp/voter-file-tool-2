#!/usr/bin/env node
/**
 * Generate structured diff data for two MCDC committee XLSX exports.
 * Uses the same parsing rules as bulkLoadUtils.ts and compare-committee-exports.ts.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as xlsx from "xlsx";

const OLD_FILE = "apps/frontend/data/Committee-File-2025-05-15.xlsx";
const NEW_FILE = "apps/frontend/data/Committee File 2026-04-16(1).xlsx";

const TRACKED_FIELDS = [
  "name",
  "res address1",
  "res city",
  "res zip",
] as const;

type TrackedField = (typeof TRACKED_FIELDS)[number];

type ParsedRow = {
  voterId: string;
  name: string;
  committeeKey: string;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  fields: Record<TrackedField, string>;
  rawCommittee: string;
  rowIndex: number;
};

type DuplicateEntry = {
  voterId: string;
  rows: Array<{
    name: string;
    committeeKey: string;
    rawCommittee: string;
    rowIndex: number;
  }>;
};

/** Normalize whitespace in export field values for comparison. */
function normalizeFieldValue(value: string | undefined): string {
  return (value ?? "")
    .split(" ")
    .filter((part) => part !== "")
    .join(" ");
}

/** Parse city/town from the Committee column, matching bulk load logic. */
function parseCityTown(committeeColumn: string | undefined): string {
  const city = committeeColumn?.includes("LD ")
    ? "Rochester"
    : committeeColumn;
  if (!city) {
    throw new Error("Missing Committee value");
  }
  return city.toUpperCase();
}

/** Build a stable committee key for grouping and comparison. */
function committeeKey(cityTown: string, legDistrict: number, electionDistrict: number): string {
  return `${cityTown}-${legDistrict}-${String(electionDistrict).padStart(3, "0")}`;
}

/** Format committee for human-readable output. */
function formatCommittee(cityTown: string, legDistrict: number, electionDistrict: number): string {
  return `${cityTown} LT ${legDistrict} ED ${electionDistrict}`;
}

/** Load workbook and return sheet metadata plus parsed rows. */
function loadFile(filePath: string): {
  filePath: string;
  sheetName: string;
  headers: string[];
  rows: ParsedRow[];
  duplicates: DuplicateEntry[];
  invalidRows: Array<{ rowIndex: number; reason: string }>;
} {
  const resolvedPath = path.resolve(filePath);
  const workbook = xlsx.read(fs.readFileSync(resolvedPath));
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error(`No worksheets in ${filePath}`);
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet not found in ${filePath}`);
  }

  const rawRows = xlsx.utils.sheet_to_json(sheet) as Record<string, string>[];
  const headerRows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
  }) as unknown[][];
  const headers = (headerRows[0] ?? []).map((header) => String(header).trim());

  const byVoter = new Map<string, ParsedRow[]>();
  const invalidRows: Array<{ rowIndex: number; reason: string }> = [];

  for (const [index, row] of rawRows.entries()) {
    const voterId = row["voter id"]?.trim();
    if (!voterId) {
      invalidRows.push({ rowIndex: index + 2, reason: "Missing voter id" });
      continue;
    }

    const cityTown = parseCityTown(row.Committee);
    const legDistrict = Number(row["Serve LT"]);
    const electionDistrict = Number(row["Serve ED"]);

    if (!legDistrict || !electionDistrict) {
      invalidRows.push({
        rowIndex: index + 2,
        reason: `Invalid Serve LT/ED for voter ${voterId}`,
      });
      continue;
    }

    const parsed: ParsedRow = {
      voterId,
      name: normalizeFieldValue(row.name),
      committeeKey: committeeKey(cityTown, legDistrict, electionDistrict),
      cityTown,
      legDistrict,
      electionDistrict,
      fields: Object.fromEntries(
        TRACKED_FIELDS.map((field) => [
          field,
          normalizeFieldValue(row[field]),
        ]),
      ) as Record<TrackedField, string>,
      rawCommittee: row.Committee ?? "",
      rowIndex: index + 2,
    };

    const existing = byVoter.get(voterId) ?? [];
    existing.push(parsed);
    byVoter.set(voterId, existing);
  }

  const duplicates: DuplicateEntry[] = [];
  const rows: ParsedRow[] = [];

  for (const [voterId, entries] of byVoter.entries()) {
    if (entries.length > 1) {
      duplicates.push({
        voterId,
        rows: entries.map((entry) => ({
          name: entry.name,
          committeeKey: entry.committeeKey,
          rawCommittee: entry.rawCommittee,
          rowIndex: entry.rowIndex,
        })),
      });
    }
    rows.push(entries[0]!);
  }

  return {
    filePath,
    sheetName,
    headers,
    rows,
    duplicates,
    invalidRows,
  };
}

/** Build committee membership counts from parsed rows. */
function committeeSizes(rows: ParsedRow[]): Map<string, number> {
  const sizes = new Map<string, number>();
  for (const row of rows) {
    sizes.set(row.committeeKey, (sizes.get(row.committeeKey) ?? 0) + 1);
  }
  return sizes;
}

/** Group rows by committee key. */
function groupByCommittee(rows: ParsedRow[]): Map<string, ParsedRow[]> {
  const grouped = new Map<string, ParsedRow[]>();
  for (const row of rows) {
    const entries = grouped.get(row.committeeKey) ?? [];
    entries.push(row);
    grouped.set(row.committeeKey, entries);
  }
  return grouped;
}

function main(): void {
  const oldData = loadFile(OLD_FILE);
  const newData = loadFile(NEW_FILE);

  const oldByVoter = new Map(oldData.rows.map((row) => [row.voterId, row]));
  const newByVoter = new Map(newData.rows.map((row) => [row.voterId, row]));

  const added = [...newByVoter.values()]
    .filter((row) => !oldByVoter.has(row.voterId))
    .sort((a, b) => a.voterId.localeCompare(b.voterId));

  const removed = [...oldByVoter.values()]
    .filter((row) => !newByVoter.has(row.voterId))
    .sort((a, b) => a.voterId.localeCompare(b.voterId));

  const moved: Array<{
    voterId: string;
    name: string;
    from: string;
    to: string;
  }> = [];

  const fieldChanges: Array<{
    voterId: string;
    name: string;
    committee: string;
    changes: Record<string, { old: string; new: string }>;
  }> = [];

  for (const [voterId, oldRow] of oldByVoter.entries()) {
    const newRow = newByVoter.get(voterId);
    if (!newRow) {
      continue;
    }

    if (oldRow.committeeKey !== newRow.committeeKey) {
      moved.push({
        voterId,
        name: newRow.name || oldRow.name,
        from: formatCommittee(
          oldRow.cityTown,
          oldRow.legDistrict,
          oldRow.electionDistrict,
        ),
        to: formatCommittee(
          newRow.cityTown,
          newRow.legDistrict,
          newRow.electionDistrict,
        ),
      });
      continue;
    }

    const changes: Record<string, { old: string; new: string }> = {};
    for (const field of TRACKED_FIELDS) {
      if (oldRow.fields[field] !== newRow.fields[field]) {
        changes[field] = {
          old: oldRow.fields[field],
          new: newRow.fields[field],
        };
      }
    }

    if (Object.keys(changes).length > 0) {
      fieldChanges.push({
        voterId,
        name: newRow.name || oldRow.name,
        committee: formatCommittee(
          newRow.cityTown,
          newRow.legDistrict,
          newRow.electionDistrict,
        ),
        changes,
      });
    }
  }

  const oldSizes = committeeSizes(oldData.rows);
  const newSizes = committeeSizes(newData.rows);

  const newCommittees = [...newSizes.keys()]
    .filter((key) => !oldSizes.has(key))
    .sort();

  const disbandedCommittees = [...oldSizes.keys()]
    .filter((key) => !newSizes.has(key))
    .sort();

  const sizeChanges = [...new Set([...oldSizes.keys(), ...newSizes.keys()])]
    .map((key) => ({
      committeeKey: key,
      oldCount: oldSizes.get(key) ?? 0,
      newCount: newSizes.get(key) ?? 0,
      delta: (newSizes.get(key) ?? 0) - (oldSizes.get(key) ?? 0),
    }))
    .filter((entry) => entry.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const addedByCommittee = groupByCommittee(added);
  const addedGrouped = [...addedByCommittee.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, members]) => ({
      committeeKey: key,
      count: members.length,
      members: members
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) => ({ voterId: m.voterId, name: m.name })),
    }));

  const newColumns = newData.headers.filter(
    (header) => !oldData.headers.includes(header),
  );
  const removedColumns = oldData.headers.filter(
    (header) => !newData.headers.includes(header),
  );

  const rochesterOld = [...oldSizes.keys()].filter((k) =>
    k.startsWith("ROCHESTER-"),
  ).length;
  const rochesterNew = [...newSizes.keys()].filter((k) =>
    k.startsWith("ROCHESTER-"),
  ).length;

  const report = {
    oldFile: OLD_FILE,
    newFile: NEW_FILE,
    structural: {
      oldSheetName: oldData.sheetName,
      newSheetName: newData.sheetName,
      oldRowCount: oldData.rows.length + oldData.duplicates.reduce((n, d) => n + d.rows.length - 1, 0),
      newRowCount: newData.rows.length,
      oldUniqueVoters: oldData.rows.length,
      newUniqueVoters: newData.rows.length,
      oldCommitteeCount: oldSizes.size,
      newCommitteeCount: newSizes.size,
      oldHeaders: oldData.headers,
      newHeaders: newData.headers,
      newColumns,
      removedColumns,
      rochesterCommitteeCount: { old: rochesterOld, new: rochesterNew },
    },
    dataQuality: {
      oldDuplicates: oldData.duplicates,
      newDuplicates: newData.duplicates,
      oldInvalidRows: oldData.invalidRows,
      newInvalidRows: newData.invalidRows,
    },
    membership: {
      addedCount: added.length,
      removedCount: removed.length,
      movedCount: moved.length,
      fieldChangeCount: fieldChanges.length,
      netChange: newData.rows.length - oldData.rows.length,
      added,
      removed,
      moved,
      fieldChanges,
      addedGrouped,
    },
    committees: {
      newCommittees: newCommittees.map((key) => ({
        committeeKey: key,
        memberCount: newSizes.get(key) ?? 0,
      })),
      disbandedCommittees: disbandedCommittees.map((key) => ({
        committeeKey: key,
        memberCount: oldSizes.get(key) ?? 0,
      })),
      sizeChanges,
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
