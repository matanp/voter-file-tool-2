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
