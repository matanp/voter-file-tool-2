/**
 * POST /api/admin/crosswalk/import
 * SRS 3.7 — Bulk import LTED crosswalk from MCDC LTED Matrix Excel.
 */

import prisma from "~/lib/prisma";
import { NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { logAuditEvent } from "~/lib/auditLog";
import {
  normalizeTownCode,
  parseDistrictValue,
} from "~/lib/lted/digitParsing";
import { lookupCityTown } from "~/lib/lted/monroeTownCodes";
import {
  getRowValue,
  isUploadFile,
  parseXlsxUpload,
} from "~/lib/lted/xlsxUpload";
import type { XlsxRow } from "~/lib/lted/xlsxUpload";
import type { NextRequest } from "next/server";
import type { SessionWithUser } from "~/app/api/lib/withPrivilege";

const MAX_ERROR_REPORT = 50;

export const maxDuration = 60;

// Prisma's 5 s interactive-transaction default is tight for a county-wide write
// against a hosted database.
const IMPORT_TRANSACTION_TIMEOUT_MS = 30_000;

type ParsedRow = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  stateAssemblyDistrict: string;
  stateSenateDistrict: string | null;
  congressionalDistrict: string | null;
  countyLegDistrict: string | null;
};

/** Validate and normalize one LTED Matrix row for crosswalk upsert. */
function parseRow(
  row: XlsxRow,
  rowIndex: number,
): { ok: ParsedRow } | { error: string } {
  const townCode = normalizeTownCode(getRowValue(row, "town", "Town"));
  if (!townCode) {
    return { error: `Row ${rowIndex}: missing or invalid town` };
  }

  const cityTown = lookupCityTown(townCode, "strict");
  if (!cityTown) {
    return { error: `Row ${rowIndex}: unknown town code "${townCode}"` };
  }

  const legDistrict = parseDistrictValue(getRowValue(row, "ward", "Ward"));
  if (legDistrict === null) {
    return { error: `Row ${rowIndex}: invalid leg district` };
  }

  const electionDistrict = parseDistrictValue(
    getRowValue(row, "district", "District"),
  );
  if (electionDistrict === null) {
    return { error: `Row ${rowIndex}: invalid election district` };
  }

  const stlegDist = String(getRowValue(row, "stleg_dist")).trim();
  if (!stlegDist) {
    return { error: `Row ${rowIndex}: missing state assembly district` };
  }

  const stsenRaw = getRowValue(row, "stsen_dist");
  const congRaw = getRowValue(row, "cong_dist");
  const othrRaw = getRowValue(row, "othr_dist1");
  const stsenDist =
    stsenRaw !== "" ? String(stsenRaw).trim() : null;
  const congDist = congRaw !== "" ? String(congRaw).trim() : null;
  const othrDist1 = othrRaw !== "" ? String(othrRaw).trim() : null;

  return {
    ok: {
      cityTown,
      legDistrict,
      electionDistrict,
      stateAssemblyDistrict: stlegDist,
      stateSenateDistrict: stsenDist,
      congressionalDistrict: congDist,
      countyLegDistrict: othrDist1,
    },
  };
}

function crosswalkKey(row: {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
}): string {
  return `${row.cityTown}|${row.legDistrict}|${row.electionDistrict}`;
}

function hasDistrictChanges(existing: ParsedRow, incoming: ParsedRow): boolean {
  return (
    existing.stateAssemblyDistrict !== incoming.stateAssemblyDistrict ||
    existing.stateSenateDistrict !== incoming.stateSenateDistrict ||
    existing.congressionalDistrict !== incoming.congressionalDistrict ||
    existing.countyLegDistrict !== incoming.countyLegDistrict
  );
}

async function importHandler(req: NextRequest, session: SessionWithUser) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!isUploadFile(file)) {
      return NextResponse.json(
        { error: "Excel file is required (field: file)" },
        { status: 400 },
      );
    }

    const parsed = await parseXlsxUpload(file, {
      sheetPreference: "preferNewLtedMatrix",
    });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { rows } = parsed;
    const errors: { row: number; message: string }[] = [];
    let skipped = 0;

    // Keyed by the crosswalk's unique key; a key repeated in the file keeps its last row.
    const incomingByKey = new Map<string, ParsedRow>();
    let duplicates = 0;
    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 2;
      const result = parseRow(rows[i]!, rowIndex);
      if ("error" in result) {
        skipped++;
        if (errors.length < MAX_ERROR_REPORT) {
          errors.push({ row: rowIndex, message: result.error });
        }
        continue;
      }
      const key = crosswalkKey(result.ok);
      if (incomingByKey.has(key)) duplicates++;
      incomingByKey.set(key, result.ok);
    }

    // One read of the whole crosswalk (one row per county LTED) replaces a
    // findUnique + upsert per row, which timed out on full-county files.
    const existingRows = await prisma.ltedDistrictCrosswalk.findMany();
    const existingByKey = new Map(
      existingRows.map((row) => [crosswalkKey(row), row]),
    );

    const toCreate: ParsedRow[] = [];
    const toUpdate: Array<ParsedRow & { id: string }> = [];
    for (const [key, incoming] of incomingByKey) {
      const existing = existingByKey.get(key);
      if (!existing) {
        toCreate.push(incoming);
      } else if (hasDistrictChanges(existing, incoming)) {
        toUpdate.push({ ...incoming, id: existing.id });
      }
    }

    if (toCreate.length > 0 || toUpdate.length > 0) {
      await prisma.$transaction(
        async (tx) => {
          if (toCreate.length > 0) {
            await tx.ltedDistrictCrosswalk.createMany({ data: toCreate });
          }
          if (toUpdate.length > 0) {
            // Prisma has no per-row-values bulk update, so changed rows are one raw
            // statement joined against unnest'd column arrays.
            await tx.$executeRaw`
              UPDATE "LtedDistrictCrosswalk" AS x
              SET "stateAssemblyDistrict" = r.state_assembly,
                  "stateSenateDistrict" = r.state_senate,
                  "congressionalDistrict" = r.congressional,
                  "countyLegDistrict" = r.county_leg
              FROM unnest(
                ${toUpdate.map((row) => row.id)}::text[],
                ${toUpdate.map((row) => row.stateAssemblyDistrict)}::text[],
                ${toUpdate.map((row) => row.stateSenateDistrict)}::text[],
                ${toUpdate.map((row) => row.congressionalDistrict)}::text[],
                ${toUpdate.map((row) => row.countyLegDistrict)}::text[]
              ) AS r(id, state_assembly, state_senate, congressional, county_leg)
              WHERE x.id = r.id
            `;
          }
        },
        { timeout: IMPORT_TRANSACTION_TIMEOUT_MS },
      );
    }

    const created = toCreate.length;
    const updated = toUpdate.length;
    const unchanged = incomingByKey.size - created - updated;

    const summary = {
      rowsProcessed: rows.length,
      created,
      updated,
      unchanged,
      duplicates,
      skipped,
      errors,
    };

    // Fail-open: crosswalk import summary is reference/config telemetry, not membership state.
    await logAuditEvent(
      session.user.id,
      session.user.privilegeLevel ?? PrivilegeLevel.Admin,
      "CROSSWALK_IMPORTED",
      "LtedDistrictCrosswalk",
      `import-${Date.now()}`,
      null,
      summary,
      { importType: "crosswalk" },
    );

    return NextResponse.json(
      { success: true, summary },
      { status: 200 },
    );
  } catch (error) {
    console.error("Crosswalk import error:", error);
    return NextResponse.json(
      { error: "Import failed" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, importHandler);
