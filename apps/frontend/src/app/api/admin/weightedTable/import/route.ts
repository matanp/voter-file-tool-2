/**
 * POST /api/admin/weightedTable/import
 * SRS 1.4 — Import LTED weights from MCDC Weighted Table Excel.
 * Per SRS_LTED_WEIGHT_SOURCE: resolve full committee key and avoid ambiguous LD/ED-only updates.
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

type ParsedLted = {
  ltedKey: string;
  legDistrict: number;
  electionDistrict: number;
};

type MatrixMatch = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
};

type UploadFile = {
  arrayBuffer: () => Promise<ArrayBuffer>;
};

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

function normalizeDigits(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const withoutDecimal = raw.replace(/\.0+$/, "");
  if (!/^\d+$/.test(withoutDecimal)) return null;
  const noLeadingZeros = withoutDecimal.replace(/^0+/, "");
  return noLeadingZeros.length > 0 ? noLeadingZeros : "0";
}

function parseLted(value: unknown): ParsedLted | null {
  const ltedKey = normalizeDigits(value);
  if (!ltedKey || ltedKey.length < 4) return null;

  const edStr = ltedKey.slice(-3);
  const ldStr = ltedKey.slice(0, -3);
  const legDistrict = parseInt(ldStr, 10);
  const electionDistrict = parseInt(edStr, 10);
  if (Number.isNaN(legDistrict) || Number.isNaN(electionDistrict)) return null;
  if (legDistrict < 0 || electionDistrict < 0) return null;
  return { ltedKey, legDistrict, electionDistrict };
}

function parseDistrictValue(value: unknown): number | null {
  const digits = normalizeDigits(value);
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

function normalizeTownCode(value: unknown): string | null {
  const parsed = parseDistrictValue(value);
  if (parsed === null) return null;
  return parsed.toString().padStart(3, "0");
}

function toCityTown(townCode: string): string {
  return (TOWN_CODE_TO_CITY[townCode] ?? townCode).trim().toUpperCase();
}

function committeeKey(
  cityTown: string,
  legDistrict: number,
  electionDistrict: number,
): string {
  return `${cityTown.trim().toUpperCase()}|${legDistrict}|${electionDistrict}`;
}

function districtKey(legDistrict: number, electionDistrict: number): string {
  return `${legDistrict}|${electionDistrict}`;
}

function isUploadFile(value: unknown): value is UploadFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
  );
}

async function importHandler(req: NextRequest, _session: Session) {
  try {
    const formData = await req.formData();
    const file = formData.get("weightedTable");
    const matrixFile = formData.get("ltedMatrix");

    if (!isUploadFile(file)) {
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

    const weightedRows: Array<{
      ltedKey: string;
      legDistrict: number;
      electionDistrict: number;
      weight: number | null;
    }> = [];

    for (const row of rows) {
      const parsed = parseLted(row.LTED ?? row.Lted ?? row.lted ?? "");
      if (!parsed) continue;

      const weightRaw =
        row["Weighted Vote"] ?? row.Weight ?? row.weight ?? null;
      const weight =
        weightRaw != null
          ? typeof weightRaw === "number"
            ? weightRaw
            : Number(String(weightRaw).trim())
          : null;
      if (weight != null && (Number.isNaN(weight) || weight < 0)) continue;

      weightedRows.push({
        ...parsed,
        weight,
      });
    }

    const matrixMatchesByLted = new Map<string, MatrixMatch>();
    const ambiguousMatrixLted = new Set<string>();

    if (isUploadFile(matrixFile)) {
      const matrixBuffer = Buffer.from(await matrixFile.arrayBuffer());
      const matrixWorkbook = xlsx.read(matrixBuffer);
      const matrixSheet =
        matrixWorkbook.Sheets.NEW_LTED_Matrix ??
        matrixWorkbook.Sheets[matrixWorkbook.SheetNames[0] ?? ""];

      if (matrixSheet) {
        const matrixRows =
          xlsx.utils.sheet_to_json<Record<string, string | number>>(matrixSheet);
        for (const matrixRow of matrixRows) {
          const parsedFromLted = parseLted(
            matrixRow.LTED ?? matrixRow.Lted ?? matrixRow.lted ?? "",
          );
          if (!parsedFromLted) continue;

          const townCode = normalizeTownCode(
            matrixRow.town ?? matrixRow.Town ?? "",
          );
          if (!townCode) continue;

          const legDistrict =
            parseDistrictValue(matrixRow.ward ?? matrixRow.Ward) ??
            parsedFromLted.legDistrict;
          const electionDistrict =
            parseDistrictValue(matrixRow.district ?? matrixRow.District) ??
            parsedFromLted.electionDistrict;

          const match: MatrixMatch = {
            cityTown: toCityTown(townCode),
            legDistrict,
            electionDistrict,
          };

          const existing = matrixMatchesByLted.get(parsedFromLted.ltedKey);
          if (
            existing &&
            (existing.cityTown !== match.cityTown ||
              existing.legDistrict !== match.legDistrict ||
              existing.electionDistrict !== match.electionDistrict)
          ) {
            matrixMatchesByLted.delete(parsedFromLted.ltedKey);
            ambiguousMatrixLted.add(parsedFromLted.ltedKey);
            continue;
          }

          if (!ambiguousMatrixLted.has(parsedFromLted.ltedKey)) {
            matrixMatchesByLted.set(parsedFromLted.ltedKey, match);
          }
        }
      }
    }

    const committees = await prisma.committeeList.findMany({
      where: { termId: activeTermId },
      select: {
        id: true,
        cityTown: true,
        legDistrict: true,
        electionDistrict: true,
      },
    });

    const committeesByFullKey = new Map<string, { id: number }>();
    const committeesByDistrict = new Map<
      string,
      Array<{ id: number; cityTown: string }>
    >();
    for (const committee of committees) {
      committeesByFullKey.set(
        committeeKey(
          committee.cityTown,
          committee.legDistrict,
          committee.electionDistrict,
        ),
        { id: committee.id },
      );

      const key = districtKey(committee.legDistrict, committee.electionDistrict);
      const existing = committeesByDistrict.get(key) ?? [];
      existing.push({ id: committee.id, cityTown: committee.cityTown });
      committeesByDistrict.set(key, existing);
    }

    const uniqueDistricts = Array.from(
      new Set(weightedRows.map((row) => districtKey(row.legDistrict, row.electionDistrict))),
    ).map((key) => {
      const [legDistrict, electionDistrict] = key
        .split("|")
        .map((value) => Number.parseInt(value, 10));
      return { legDistrict, electionDistrict };
    });

    const crosswalkMatches =
      uniqueDistricts.length > 0
        ? await prisma.ltedDistrictCrosswalk.findMany({
            where: {
              OR: uniqueDistricts.map(({ legDistrict, electionDistrict }) => ({
                legDistrict,
                electionDistrict,
              })),
            },
            select: {
              cityTown: true,
              legDistrict: true,
              electionDistrict: true,
            },
          })
        : [];

    const crosswalkCitiesByDistrict = new Map<string, Set<string>>();
    for (const row of crosswalkMatches) {
      const key = districtKey(row.legDistrict, row.electionDistrict);
      const cities = crosswalkCitiesByDistrict.get(key) ?? new Set<string>();
      cities.add(row.cityTown.trim().toUpperCase());
      crosswalkCitiesByDistrict.set(key, cities);
    }

    const uniqueCrosswalkCityByDistrict = new Map<string, string>();
    for (const [key, cities] of crosswalkCitiesByDistrict.entries()) {
      if (cities.size !== 1) continue;
      uniqueCrosswalkCityByDistrict.set(key, Array.from(cities)[0]!);
    }

    let matched = 0;
    let skippedNoCommittee = 0;
    let skippedAmbiguous = 0;

    for (const row of weightedRows) {
      if (ambiguousMatrixLted.has(row.ltedKey)) {
        skippedAmbiguous++;
        continue;
      }

      const matrixMatch = matrixMatchesByLted.get(row.ltedKey);
      let committeeIdToUpdate: number | null = null;

      if (matrixMatch) {
        const committee = committeesByFullKey.get(
          committeeKey(
            matrixMatch.cityTown,
            matrixMatch.legDistrict,
            matrixMatch.electionDistrict,
          ),
        );
        if (!committee) {
          skippedNoCommittee++;
          continue;
        }
        committeeIdToUpdate = committee.id;
      } else {
        const key = districtKey(row.legDistrict, row.electionDistrict);
        const districtCommittees = committeesByDistrict.get(key) ?? [];
        if (districtCommittees.length === 0) {
          skippedNoCommittee++;
          continue;
        }

        if (districtCommittees.length === 1) {
          committeeIdToUpdate = districtCommittees[0]!.id;
        } else {
          const mappedCity = uniqueCrosswalkCityByDistrict.get(key);
          if (mappedCity) {
            const candidate = districtCommittees.find(
              (committee) => committee.cityTown.trim().toUpperCase() === mappedCity,
            );
            committeeIdToUpdate = candidate?.id ?? null;
          }

          if (!committeeIdToUpdate) {
            skippedAmbiguous++;
            continue;
          }
        }
      }

      if (!committeeIdToUpdate) {
        skippedNoCommittee++;
        continue;
      }

      await prisma.committeeList.update({
        where: { id: committeeIdToUpdate },
        data: { ltedWeight: row.weight },
      });
      await recomputeSeatWeights(committeeIdToUpdate);
      matched++;
    }

    return NextResponse.json(
      {
        success: true,
        matched,
        skippedNoCommittee,
        skippedAmbiguous,
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
