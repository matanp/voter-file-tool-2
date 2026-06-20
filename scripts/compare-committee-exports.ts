#!/usr/bin/env node
/**
 * Compare two committee list XLSX files and print differences.
 * Supports MCDC import exports and multi-sheet committee reports (Name/Address).
 *
 * Usage:
 *   pnpm compare-committees <old.xlsx> <new.xlsx> [--json]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as xlsx from "xlsx";

const MCDC_TRACKED_FIELDS = [
  "name",
  "res address1",
  "res city",
  "res state",
  "res zip",
] as const;

type McdcTrackedField = (typeof MCDC_TRACKED_FIELDS)[number];
type ExportFormat = "mcdc" | "report";

type CommitteeAssignment = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
};

type McdcMember = CommitteeAssignment & {
  voterId: string;
  fields: Record<McdcTrackedField, string>;
};

type ReportMember = {
  memberKey: string;
  name: string;
  address: string;
  sheetName: string;
};

type CommitteeDiff = {
  format: ExportFormat;
  summary: {
    oldFile: string;
    newFile: string;
    oldMemberCount: number;
    newMemberCount: number;
    addedCount: number;
    removedCount: number;
    movedCount: number;
    fieldChangeCount: number;
    rowOrderOnlyDiff?: boolean;
  };
  added: Array<
    | (McdcMember & { kind: "mcdc" })
    | (ReportMember & { kind: "report" })
  >;
  removed: Array<
    | (McdcMember & { kind: "mcdc" })
    | (ReportMember & { kind: "report" })
  >;
  moved: Array<{
    identifier: string;
    name: string;
    from: string;
    to: string;
  }>;
  fieldChanges: Array<{
    identifier: string;
    name: string;
    location: string;
    changes: Record<string, { old: string; new: string }>;
  }>;
};

/** Normalize whitespace in export field values for comparison. */
function normalizeFieldValue(value: string | undefined): string {
  return (value ?? "")
    .split(" ")
    .filter((part) => part !== "")
    .join(" ");
}

/** Normalize name/address values for report-format matching. */
function normalizeReportValue(value: string | undefined): string {
  return normalizeFieldValue(value).toUpperCase();
}

/** Load an XLSX workbook from disk. */
function loadWorkbook(filePath: string): xlsx.WorkBook {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const fileBuffer = fs.readFileSync(resolvedPath);
  return xlsx.read(fileBuffer);
}

/** Detect whether a workbook is an MCDC import or a multi-sheet report. */
function detectExportFormat(workbook: xlsx.WorkBook): ExportFormat {
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("No worksheets found");
  }

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    throw new Error(`Worksheet "${firstSheetName}" not found`);
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
  const headers = (rows[0] ?? []).map((header) => String(header).trim());

  if (headers.includes("voter id")) {
    return "mcdc";
  }

  if (headers.includes("Name") && headers.includes("Address")) {
    return "report";
  }

  throw new Error(
    `Unrecognized export format. Expected MCDC columns (voter id, Serve LT, ...) or report columns (Name, Address). Found: ${headers.join(", ")}`,
  );
}

/** Parse city/town from the Committee column, matching bulk load logic. */
function parseCityTown(committeeColumn: string | undefined): string {
  const city = committeeColumn?.includes("LD ") ? "Rochester" : committeeColumn;
  if (!city) {
    throw new Error("Missing Committee value");
  }
  return city.toUpperCase();
}

/** Build a stable committee key for grouping and comparison. */
function committeeKey(committee: CommitteeAssignment): string {
  return `${committee.cityTown}-${committee.legDistrict}-${committee.electionDistrict}`;
}

/** Read an MCDC committee export into a voter-id keyed map. */
function parseMcdcExport(workbook: xlsx.WorkBook): Map<string, McdcMember> {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("No worksheets found");
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Worksheet "${sheetName}" not found`);
  }

  const rows = xlsx.utils.sheet_to_json(sheet) as Record<string, string>[];
  const members = new Map<string, McdcMember>();

  for (const [index, row] of rows.entries()) {
    const voterId = row["voter id"]?.trim();
    if (!voterId) {
      throw new Error(`Missing voter id on row ${index + 2}`);
    }

    const cityTown = parseCityTown(row.Committee);
    const legDistrict = Number(row["Serve LT"]);
    const electionDistrict = Number(row["Serve ED"]);

    if (!legDistrict || !electionDistrict) {
      throw new Error(
        `Invalid Serve LT/ED for voter ${voterId} on row ${index + 2}`,
      );
    }

    if (members.has(voterId)) {
      throw new Error(`Duplicate voter id ${voterId}`);
    }

    const fields = Object.fromEntries(
      MCDC_TRACKED_FIELDS.map((field) => [
        field,
        normalizeFieldValue(row[field]),
      ]),
    ) as Record<McdcTrackedField, string>;

    members.set(voterId, {
      voterId,
      cityTown,
      legDistrict,
      electionDistrict,
      fields,
    });
  }

  return members;
}

/** Build a stable member key for report-format rows. */
function reportMemberKey(name: string, address: string): string {
  return `${normalizeReportValue(name)}|${normalizeReportValue(address)}`;
}

/** Read a multi-sheet committee report into a member-keyed map. */
function parseReportExport(workbook: xlsx.WorkBook): Map<string, ReportMember> {
  const members = new Map<string, ReportMember>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      continue;
    }

    const rows = xlsx.utils.sheet_to_json(sheet) as Record<string, string>[];
    for (const [index, row] of rows.entries()) {
      const name = normalizeFieldValue(row.Name);
      const address = normalizeFieldValue(row.Address);
      if (!name) {
        continue;
      }

      const memberKey = reportMemberKey(name, address);
      if (members.has(memberKey)) {
        throw new Error(
          `Duplicate member ${name} on sheet ${sheetName}, row ${index + 2}`,
        );
      }

      members.set(memberKey, {
        memberKey,
        name,
        address,
        sheetName,
      });
    }
  }

  return members;
}

/** Compare two MCDC exports and return structured differences. */
function compareMcdcExports(
  oldFile: string,
  newFile: string,
  oldMembers: Map<string, McdcMember>,
  newMembers: Map<string, McdcMember>,
): CommitteeDiff {
  const added: CommitteeDiff["added"] = [];
  const removed: CommitteeDiff["removed"] = [];
  const moved: CommitteeDiff["moved"] = [];
  const fieldChanges: CommitteeDiff["fieldChanges"] = [];

  for (const [voterId, oldMember] of oldMembers.entries()) {
    const newMember = newMembers.get(voterId);
    if (!newMember) {
      removed.push({ kind: "mcdc", ...oldMember });
      continue;
    }

    const oldCommittee: CommitteeAssignment = {
      cityTown: oldMember.cityTown,
      legDistrict: oldMember.legDistrict,
      electionDistrict: oldMember.electionDistrict,
    };
    const newCommittee: CommitteeAssignment = {
      cityTown: newMember.cityTown,
      legDistrict: newMember.legDistrict,
      electionDistrict: newMember.electionDistrict,
    };

    if (committeeKey(oldCommittee) !== committeeKey(newCommittee)) {
      moved.push({
        identifier: voterId,
        name: newMember.fields.name || oldMember.fields.name,
        from: formatCommittee(oldCommittee),
        to: formatCommittee(newCommittee),
      });
      continue;
    }

    const changes: CommitteeDiff["fieldChanges"][number]["changes"] = {};
    for (const field of MCDC_TRACKED_FIELDS) {
      if (oldMember.fields[field] !== newMember.fields[field]) {
        changes[field] = {
          old: oldMember.fields[field],
          new: newMember.fields[field],
        };
      }
    }

    if (Object.keys(changes).length > 0) {
      fieldChanges.push({
        identifier: voterId,
        name: newMember.fields.name || oldMember.fields.name,
        location: formatCommittee(newCommittee),
        changes,
      });
    }
  }

  for (const [voterId, newMember] of newMembers.entries()) {
    if (!oldMembers.has(voterId)) {
      added.push({ kind: "mcdc", ...newMember });
    }
  }

  return buildDiffResult("mcdc", oldFile, newFile, oldMembers.size, newMembers.size, {
    added,
    removed,
    moved,
    fieldChanges,
  });
}

/** Compare two committee reports and return structured differences. */
function compareReportExports(
  oldFile: string,
  newFile: string,
  oldMembers: Map<string, ReportMember>,
  newMembers: Map<string, ReportMember>,
): CommitteeDiff {
  const added: CommitteeDiff["added"] = [];
  const removed: CommitteeDiff["removed"] = [];
  const moved: CommitteeDiff["moved"] = [];
  const fieldChanges: CommitteeDiff["fieldChanges"] = [];

  for (const [memberKey, oldMember] of oldMembers.entries()) {
    const newMember = newMembers.get(memberKey);
    if (!newMember) {
      removed.push({ kind: "report", ...oldMember });
      continue;
    }

    if (oldMember.sheetName !== newMember.sheetName) {
      moved.push({
        identifier: memberKey,
        name: oldMember.name,
        from: oldMember.sheetName,
        to: newMember.sheetName,
      });
    }
  }

  const oldByName = groupReportMembersByName(oldMembers);
  const newByName = groupReportMembersByName(newMembers);

  for (const [name, oldEntries] of oldByName.entries()) {
    const newEntries = newByName.get(name) ?? [];
    if (oldEntries.length !== 1 || newEntries.length !== 1) {
      continue;
    }

    const oldMember = oldEntries[0];
    const newMember = newEntries[0];
    if (!oldMember || !newMember) {
      continue;
    }

    if (oldMember.memberKey === newMember.memberKey) {
      continue;
    }

    fieldChanges.push({
      identifier: name,
      name,
      location: newMember.sheetName,
      changes: {
        address: { old: oldMember.address, new: newMember.address },
      },
    });
  }

  for (const [memberKey, newMember] of newMembers.entries()) {
    if (!oldMembers.has(memberKey)) {
      added.push({ kind: "report", ...newMember });
    }
  }

  const diff = buildDiffResult(
    "report",
    oldFile,
    newFile,
    oldMembers.size,
    newMembers.size,
    { added, removed, moved, fieldChanges },
  );

  if (
    diff.summary.addedCount === 0 &&
    diff.summary.removedCount === 0 &&
    diff.summary.movedCount === 0 &&
    diff.summary.fieldChangeCount === 0
  ) {
    diff.summary.rowOrderOnlyDiff = hasReportRowOrderDiff(oldFile, newFile);
  }

  return diff;
}

/** Group report members by normalized name for address-change detection. */
function groupReportMembersByName(
  members: Map<string, ReportMember>,
): Map<string, ReportMember[]> {
  const grouped = new Map<string, ReportMember[]>();
  for (const member of members.values()) {
    const name = normalizeReportValue(member.name);
    const entries = grouped.get(name) ?? [];
    entries.push(member);
    grouped.set(name, entries);
  }
  return grouped;
}

/** Build the final diff object with sorted entries. */
function buildDiffResult(
  format: ExportFormat,
  oldFile: string,
  newFile: string,
  oldMemberCount: number,
  newMemberCount: number,
  diff: Pick<CommitteeDiff, "added" | "removed" | "moved" | "fieldChanges">,
): CommitteeDiff {
  diff.added.sort((a, b) =>
    ("voterId" in a ? a.voterId : a.memberKey).localeCompare(
      "voterId" in b ? b.voterId : b.memberKey,
    ),
  );
  diff.removed.sort((a, b) =>
    ("voterId" in a ? a.voterId : a.memberKey).localeCompare(
      "voterId" in b ? b.voterId : b.memberKey,
    ),
  );
  diff.moved.sort((a, b) => a.identifier.localeCompare(b.identifier));
  diff.fieldChanges.sort((a, b) => a.identifier.localeCompare(b.identifier));

  return {
    format,
    summary: {
      oldFile,
      newFile,
      oldMemberCount,
      newMemberCount,
      addedCount: diff.added.length,
      removedCount: diff.removed.length,
      movedCount: diff.moved.length,
      fieldChangeCount: diff.fieldChanges.length,
    },
    ...diff,
  };
}

/** Detect whether two report files differ only in row ordering within sheets. */
function hasReportRowOrderDiff(oldFile: string, newFile: string): boolean {
  const oldWorkbook = loadWorkbook(oldFile);
  const newWorkbook = loadWorkbook(newFile);

  for (const sheetName of oldWorkbook.SheetNames) {
    const oldSheet = oldWorkbook.Sheets[sheetName];
    const newSheet = newWorkbook.Sheets[sheetName];
    if (!oldSheet || !newSheet) {
      return false;
    }

    const oldRows = xlsx.utils.sheet_to_json(oldSheet) as Record<string, string>[];
    const newRows = xlsx.utils.sheet_to_json(newSheet) as Record<string, string>[];

    const oldSerialized = oldRows
      .map((row) => `${row.Name ?? ""}|${row.Address ?? ""}`)
      .join("\n");
    const newSerialized = newRows
      .map((row) => `${row.Name ?? ""}|${row.Address ?? ""}`)
      .join("\n");

    if (oldSerialized !== newSerialized) {
      return true;
    }
  }

  return false;
}

/** Format a committee assignment for human-readable output. */
function formatCommittee(committee: CommitteeAssignment): string {
  return `${committee.cityTown} LT ${committee.legDistrict} ED ${committee.electionDistrict}`;
}

/** Print a human-readable diff report to stdout. */
function printReport(diff: CommitteeDiff): void {
  const { summary } = diff;

  console.log("\nCommittee export comparison");
  console.log("===========================");
  console.log(`Format: ${diff.format === "mcdc" ? "MCDC import" : "Committee report"}`);
  console.log(`Old: ${summary.oldFile} (${summary.oldMemberCount} members)`);
  console.log(`New: ${summary.newFile} (${summary.newMemberCount} members)`);
  console.log("");
  console.log(`Added:         ${summary.addedCount}`);
  console.log(`Removed:       ${summary.removedCount}`);
  console.log(`Moved:         ${summary.movedCount}`);
  console.log(`Field changes: ${summary.fieldChangeCount}`);

  if (diff.removed.length > 0) {
    console.log("\nRemoved members");
    console.log("---------------");
    for (const member of diff.removed) {
      if (member.kind === "mcdc") {
        console.log(
          `- ${member.voterId} | ${member.fields.name || "(no name)"} | ${formatCommittee(member)}`,
        );
      } else {
        console.log(
          `- ${member.name} | ${member.address} | ${member.sheetName}`,
        );
      }
    }
  }

  if (diff.added.length > 0) {
    console.log("\nAdded members");
    console.log("-------------");
    for (const member of diff.added) {
      if (member.kind === "mcdc") {
        console.log(
          `- ${member.voterId} | ${member.fields.name || "(no name)"} | ${formatCommittee(member)}`,
        );
      } else {
        console.log(
          `- ${member.name} | ${member.address} | ${member.sheetName}`,
        );
      }
    }
  }

  if (diff.moved.length > 0) {
    console.log("\nMoved members");
    console.log("-------------");
    for (const member of diff.moved) {
      console.log(
        `- ${member.identifier} | ${member.name || "(no name)"} | ${member.from} -> ${member.to}`,
      );
    }
  }

  if (diff.fieldChanges.length > 0) {
    console.log("\nField changes");
    console.log("-------------");
    for (const member of diff.fieldChanges) {
      console.log(
        `- ${member.identifier} | ${member.name || "(no name)"} | ${member.location}`,
      );
      for (const [field, change] of Object.entries(member.changes)) {
        console.log(`    ${field}: "${change.old}" -> "${change.new}"`);
      }
    }
  }

  if (
    diff.summary.addedCount === 0 &&
    diff.summary.removedCount === 0 &&
    diff.summary.movedCount === 0 &&
    diff.summary.fieldChangeCount === 0
  ) {
    if (summary.rowOrderOnlyDiff) {
      console.log(
        "\nNo membership differences found. Files differ only in row order within sheets.",
      );
    } else {
      console.log("\nNo differences found.");
    }
  }

  console.log("");
}

/** Parse CLI args and run the comparison. */
function main(): void {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const fileArgs = args.filter((arg) => arg !== "--json");

  if (fileArgs.length !== 2) {
    console.error("Usage: pnpm compare-committees <old.xlsx> <new.xlsx> [--json]");
    process.exit(1);
  }

  const [oldFile, newFile] = fileArgs as [string, string];

  try {
    const oldWorkbook = loadWorkbook(oldFile);
    const newWorkbook = loadWorkbook(newFile);
    const oldFormat = detectExportFormat(oldWorkbook);
    const newFormat = detectExportFormat(newWorkbook);

    if (oldFormat !== newFormat) {
      throw new Error(
        `Export format mismatch: old file is ${oldFormat}, new file is ${newFormat}`,
      );
    }

    const diff =
      oldFormat === "mcdc"
        ? compareMcdcExports(
            oldFile,
            newFile,
            parseMcdcExport(oldWorkbook),
            parseMcdcExport(newWorkbook),
          )
        : compareReportExports(
            oldFile,
            newFile,
            parseReportExport(oldWorkbook),
            parseReportExport(newWorkbook),
          );

    if (jsonOutput) {
      console.log(JSON.stringify(diff, null, 2));
    } else {
      printReport(diff);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

main();
