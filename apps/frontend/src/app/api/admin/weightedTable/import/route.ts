/**
 * POST /api/admin/weightedTable/import
 * SRS 1.4 — Import LTED weights from MCDC Weighted Table Excel.
 * Per SRS_LTED_WEIGHT_SOURCE: resolve full committee key and avoid ambiguous LD/ED-only updates.
 */

import prisma from "~/lib/prisma";
import { NextResponse } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import { withPrivilege } from "~/app/api/lib/withPrivilege";
import { getActiveTermId } from "~/app/api/lib/committeeValidation";
import { recomputeSeatWeights } from "~/app/api/lib/seatUtils";
import {
  normalizeDigits,
  normalizeTownCode,
  parseDistrictValue,
} from "~/lib/lted/digitParsing";
import { lookupCityTown } from "~/lib/lted/monroeTownCodes";
import {
  getRowValue,
  isUploadFile,
  parseXlsxUpload,
} from "~/lib/lted/xlsxUpload";
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

/** Parse an LTED key into leg district and election district components. */
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

async function importHandler(req: NextRequest, _session: Session) {
  try {
    const formData = await req.formData();
    const file = formData.get("weightedTable");
    // TODO: The `ltedMatrix` param is never sent by the single-file XlsxUploadCard
    // UI, so the matrix-disambiguation branch below is currently dead from the
    // normal import path. Split this into two routes: a normal weighted-table
    // import (weightedTable only) and a separate bulk import that also accepts
    // ltedMatrix — and move this param out of the normal route.
    const matrixFile = formData.get("ltedMatrix");

    if (!isUploadFile(file)) {
      return NextResponse.json(
        { error: "Weighted Table Excel file is required" },
        { status: 400 },
      );
    }

    const parsed = await parseXlsxUpload(file, { sheetPreference: "first" });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { rows } = parsed;
    const activeTermId = await getActiveTermId();

    const weightedRows: Array<{
      ltedKey: string;
      legDistrict: number;
      electionDistrict: number;
      weight: number | null;
    }> = [];

    for (const row of rows) {
      const parsedLted = parseLted(getRowValue(row, "LTED", "Lted", "lted"));
      if (!parsedLted) continue;

      const weightRaw =
        getRowValue(row, "Weighted Vote", "Weight", "weight") ?? null;
      const weight =
        weightRaw != null && weightRaw !== ""
          ? typeof weightRaw === "number"
            ? weightRaw
            : Number(String(weightRaw).trim())
          : null;
      if (weight != null && (Number.isNaN(weight) || weight < 0)) continue;

      weightedRows.push({
        ...parsedLted,
        weight,
      });
    }

    const matrixMatchesByLted = new Map<string, MatrixMatch>();
    const ambiguousMatrixLted = new Set<string>();

    if (isUploadFile(matrixFile)) {
      const matrixParsed = await parseXlsxUpload(matrixFile, {
        sheetPreference: "preferNewLtedMatrix",
      });

      if (matrixParsed.ok) {
        for (const matrixRow of matrixParsed.rows) {
          const parsedFromLted = parseLted(
            getRowValue(matrixRow, "LTED", "Lted", "lted"),
          );
          if (!parsedFromLted) continue;

          const townCode = normalizeTownCode(
            getRowValue(matrixRow, "town", "Town"),
          );
          if (!townCode) continue;

          const legDistrict =
            parseDistrictValue(getRowValue(matrixRow, "ward", "Ward")) ??
            parsedFromLted.legDistrict;
          const electionDistrict =
            parseDistrictValue(getRowValue(matrixRow, "district", "District")) ??
            parsedFromLted.electionDistrict;

          const cityTown = lookupCityTown(townCode, "fallback");
          if (!cityTown) continue;

          const match: MatrixMatch = {
            cityTown,
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
