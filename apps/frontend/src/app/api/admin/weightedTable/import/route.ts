/**
 * POST /api/admin/weightedTable/import
 * SRS 1.4 — Import LTED weights from MCDC Weighted Table Excel.
 * Per SRS_LTED_WEIGHT_SOURCE: parse LTED, match by (legDistrict, electionDistrict), update ltedWeight.
 */

import prisma from "~/lib/prisma";
import { NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import { recomputeSeatWeights } from "~/app/api/lib/seatUtils";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

/** Parse LTED code (e.g. 04001) to legDistrict and electionDistrict. */
function parseLted(lted: string): { legDistrict: number; electionDistrict: number } | null {
  const trimmed = String(lted ?? "").trim();
  if (trimmed.length < 4) return null;
  const edStr = trimmed.slice(-3);
  const ldStr = trimmed.slice(0, -3);
  const legDistrict = parseInt(ldStr, 10);
  const electionDistrict = parseInt(edStr, 10);
  if (Number.isNaN(legDistrict) || Number.isNaN(electionDistrict)) return null;
  if (legDistrict < 0 || electionDistrict < 0) return null;
  return { legDistrict, electionDistrict };
}

async function importHandler(req: NextRequest, _session: Session) {
  try {
    const formData = await req.formData();
    const file = formData.get("weightedTable") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Weighted Table Excel file is required" },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buf);
    const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
    if (!sheet) {
      return NextResponse.json(
        { error: "No sheet found in workbook" },
        { status: 400 },
      );
    }

    const rows = xlsx.utils.sheet_to_json<Record<string, string | number>>(sheet);
    const activeTermId = await getActiveTermId();

    let matched = 0;
    let skippedNoCommittee = 0;

    for (const row of rows) {
      const ltedRaw = row["LTED"] ?? row["Lted"] ?? "";
      const weightRaw =
        row["Weighted Vote"] ?? row["Weight"] ?? row["weight"] ?? null;

      const parsed = parseLted(String(ltedRaw));
      if (!parsed) continue;

      const weight =
        weightRaw != null
          ? typeof weightRaw === "number"
            ? weightRaw
            : Number(String(weightRaw).trim())
          : null;
      if (weight != null && (Number.isNaN(weight) || weight < 0)) continue;

      const committees = await prisma.committeeList.findMany({
        where: {
          legDistrict: parsed.legDistrict,
          electionDistrict: parsed.electionDistrict,
          termId: activeTermId,
        },
        select: { id: true },
      });

      if (committees.length === 0) {
        skippedNoCommittee++;
        continue;
      }

      for (const committee of committees) {
        await prisma.committeeList.update({
          where: { id: committee.id },
          data: { ltedWeight: weight },
        });
        await recomputeSeatWeights(committee.id);
        matched++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        matched,
        skippedNoCommittee,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Weighted Table import error:", error);
    return NextResponse.json(
      { error: "Import failed" },
      { status: 500 },
    );
  }
}

export const POST = withPrivilege(PrivilegeLevel.Admin, importHandler);
