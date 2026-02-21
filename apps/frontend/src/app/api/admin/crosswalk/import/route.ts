/**
 * POST /api/admin/crosswalk/import
 * SRS 3.7 — Bulk import LTED crosswalk from MCDC LTED Matrix Excel.
 */

import prisma from "~/lib/prisma";
import { NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { logAuditEvent } from "~/lib/auditLog";
import type { NextRequest } from "next/server";
import type { SessionWithUser } from "~/app/api/lib/withPrivilege";

const TOWN_CODE_TO_CITY: Record<string, string> = {
  "005": "BRIGHTON",
  "010": "CHILI",
  "015": "CLARKSON",
  "017": "CLARKSON",
  "020": "EAST ROCHESTER",
  "025": "BRIGHTON",
  "030": "GATES",
  "035": "GATES",
  "040": "GREECE",
  "045": "HAMLIN",
  "050": "HENRIETTA",
  "055": "OGDEN",
  "060": "RIGA",
  "065": "RUSH",
  "070": "SWEDEN",
  "075": "PENFIELD",
  "080": "ROCHESTER",
  "085": "PERINTON",
  "090": "PITTSFORD",
  "095": "WEBSTER",
  "100": "WHEATLAND",
};

const MAX_ERROR_REPORT = 50;

function normalizeTownCode(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const digits = raw.replace(/^0+/, "") || "0";
  const parsed = Number.parseInt(digits, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed.toString().padStart(3, "0");
}

function toCityTown(townCode: string): string | null {
  const city = TOWN_CODE_TO_CITY[townCode];
  return city ? city.trim().toUpperCase() : null;
}

type ParsedRow = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
  stateAssemblyDistrict: string;
  stateSenateDistrict: string | null;
  congressionalDistrict: string | null;
  countyLegDistrict: string | null;
};

function parseRow(
  row: Record<string, string | number>,
  rowIndex: number,
): { ok: ParsedRow } | { error: string } {
  const townRaw = row.town ?? row.Town ?? "";
  const townCode = normalizeTownCode(townRaw);
  if (!townCode) {
    return { error: `Row ${rowIndex}: missing or invalid town` };
  }

  const cityTown = toCityTown(townCode);
  if (!cityTown) {
    return { error: `Row ${rowIndex}: unknown town code "${townCode}"` };
  }

  const wardRaw = row.ward ?? row.Ward ?? "";
  const wardStr = String(wardRaw).trim().replace(/^0+/, "") || "0";
  const legDistrict = Number.parseInt(wardStr, 10);
  if (Number.isNaN(legDistrict) || legDistrict < 0) {
    return { error: `Row ${rowIndex}: invalid leg district` };
  }

  const districtRaw = row.district ?? row.District ?? "";
  const districtStr = String(districtRaw).trim().replace(/^0+/, "") || "0";
  const electionDistrict = Number.parseInt(districtStr, 10);
  if (Number.isNaN(electionDistrict) || electionDistrict < 0) {
    return { error: `Row ${rowIndex}: invalid election district` };
  }

  const stlegDist = String(row.stleg_dist ?? "").trim();
  if (!stlegDist) {
    return { error: `Row ${rowIndex}: missing state assembly district` };
  }

  const stsenDist =
    row.stsen_dist != null ? String(row.stsen_dist).trim() : null;
  const congDist =
    row.cong_dist != null ? String(row.cong_dist).trim() : null;
  const othrDist1 =
    row.othr_dist1 != null ? String(row.othr_dist1).trim() : null;

  return {
    ok: {
      cityTown,
      legDistrict,
      electionDistrict,
      stateAssemblyDistrict: stlegDist,
      stateSenateDistrict: stsenDist ?? null,
      congressionalDistrict: congDist ?? null,
      countyLegDistrict: othrDist1 ?? null,
    },
  };
}

function isUploadFile(value: unknown): value is { arrayBuffer: () => Promise<ArrayBuffer> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
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

    const buf = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buf);
    const sheet =
      workbook.Sheets.NEW_LTED_Matrix ??
      workbook.Sheets[workbook.SheetNames[0] ?? ""];

    if (!sheet) {
      return NextResponse.json(
        { error: "No sheet found in workbook" },
        { status: 400 },
      );
    }

    const rows = xlsx.utils.sheet_to_json<Record<string, string | number>>(sheet);
    const errors: { row: number; message: string }[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

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

      const { ok } = result;
      const existing = await prisma.ltedDistrictCrosswalk.findUnique({
        where: {
          cityTown_legDistrict_electionDistrict: {
            cityTown: ok.cityTown,
            legDistrict: ok.legDistrict,
            electionDistrict: ok.electionDistrict,
          },
        },
      });

      await prisma.ltedDistrictCrosswalk.upsert({
        where: {
          cityTown_legDistrict_electionDistrict: {
            cityTown: ok.cityTown,
            legDistrict: ok.legDistrict,
            electionDistrict: ok.electionDistrict,
          },
        },
        create: ok,
        update: {
          stateAssemblyDistrict: ok.stateAssemblyDistrict,
          stateSenateDistrict: ok.stateSenateDistrict,
          congressionalDistrict: ok.congressionalDistrict,
          countyLegDistrict: ok.countyLegDistrict,
        },
      });

      if (existing) {
        updated++;
      } else {
        created++;
      }
    }

    const summary = {
      rowsProcessed: rows.length,
      created,
      updated,
      skipped,
      errors,
    };

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
