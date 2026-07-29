/**
 * Seed LtedDistrictCrosswalk from 2024 LTED Matrix.xlsx
 *
 * Usage: pnpm --filter voter-file-tool run db:seed-lted-crosswalk [path/to/2024 LTED Matrix.xlsx]
 *
 * Sheet: NEW_LTED_Matrix
 * Columns: LTED, ward, district, town, cong_dist, stsen_dist, stleg_dist, othr_dist1, othr_dist2
 * Maps: town→cityTown, ward→legDistrict, district→electionDistrict
 *
 * See docs/SRS/SRS_LTED_WEIGHT_SOURCE.md §3.1
 */

import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env") });
config({ path: path.join(process.cwd(), "..", ".env") });

import prisma from "../src/lib/prisma";
import { parseDistrictValue, normalizeTownCode } from "../src/lib/lted/digitParsing";
import { lookupCityTown } from "../src/lib/lted/monroeTownCodes";
import { getRowValue, parseXlsxBuffer } from "../src/lib/lted/xlsxUpload";

/** Resolve town code to cityTown with warn-on-unknown fallback for seeding. */
function getCityTown(townCode: string): string {
  const normalized = normalizeTownCode(townCode);
  if (!normalized) {
    console.warn(
      `Invalid town code "${townCode}" - using UNKNOWN`,
    );
    return "UNKNOWN";
  }

  const mapped = lookupCityTown(normalized, "strict");
  if (mapped) {
    return mapped;
  }

  console.warn(
    `Unknown town code "${townCode}" - using as cityTown (may not match CommitteeList)`,
  );
  return normalized;
}

async function main() {
  const defaultPath =
    process.platform === "darwin"
      ? path.join(process.env.HOME ?? "", "Downloads", "2024 LTED Matrix.xlsx")
      : path.join(process.cwd(), "data", "2024 LTED Matrix.xlsx");
  const filePath = process.argv[2] ?? defaultPath;

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    console.error(
      "Usage: pnpm exec tsx scripts/seedLtedCrosswalk.ts [path/to/2024 LTED Matrix.xlsx]",
    );
    process.exit(1);
  }

  console.log(`Reading ${filePath}...`);
  const fileBuffer = fs.readFileSync(filePath);
  const parsed = parseXlsxBuffer(fileBuffer, {
    sheetPreference: "preferNewLtedMatrix",
  });

  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  const records: Array<{
    cityTown: string;
    legDistrict: number;
    electionDistrict: number;
    stateAssemblyDistrict: string;
    stateSenateDistrict: string | null;
    congressionalDistrict: string | null;
    countyLegDistrict: string | null;
  }> = [];

  for (const row of parsed.rows) {
    const lted = String(getRowValue(row, "LTED")).trim();
    const ward = getRowValue(row, "ward", "Ward");
    const district = getRowValue(row, "district", "District");
    const town = getRowValue(row, "town", "Town");
    const stlegDist = String(getRowValue(row, "stleg_dist")).trim();
    const stsenRaw = getRowValue(row, "stsen_dist");
    const congRaw = getRowValue(row, "cong_dist");
    const othrRaw = getRowValue(row, "othr_dist1");

    if (
      !lted ||
      ward === "" ||
      district === "" ||
      town === "" ||
      !stlegDist
    ) {
      console.warn(
        `Skipping incomplete row: LTED=${lted}, ward=${String(ward)}, district=${String(district)}, town=${String(town)}`,
      );
      continue;
    }

    const legDistrict = parseDistrictValue(ward);
    const electionDistrict = parseDistrictValue(district);

    if (legDistrict === null || electionDistrict === null) {
      console.warn(
        `Skipping invalid LD/ED: ward=${String(ward)}, district=${String(district)}`,
      );
      continue;
    }

    records.push({
      cityTown: getCityTown(String(town)),
      legDistrict,
      electionDistrict,
      stateAssemblyDistrict: stlegDist,
      stateSenateDistrict:
        stsenRaw !== "" ? String(stsenRaw).trim() : null,
      congressionalDistrict:
        congRaw !== "" ? String(congRaw).trim() : null,
      countyLegDistrict: othrRaw !== "" ? String(othrRaw).trim() : null,
    });
  }

  console.log(`Parsed ${records.length} rows`);

  if (records.length === 0) {
    console.error("No valid records to insert");
    process.exit(1);
  }

  // Replace all crosswalk data atomically (delete + insert in single transaction)
  const [deleted, result] = await prisma.$transaction([
    prisma.ltedDistrictCrosswalk.deleteMany({}),
    prisma.ltedDistrictCrosswalk.createMany({ data: records }),
  ]);

  console.log(`Cleared ${deleted.count} existing records`);
  console.log(`Inserted ${result.count} LtedDistrictCrosswalk records`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
