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
import * as xlsx from "xlsx";

config({ path: path.join(process.cwd(), ".env") });
config({ path: path.join(process.cwd(), "..", ".env") });

import prisma from "../src/lib/prisma";

// Monroe County town code → cityTown (matches CommitteeList.cityTown format)
// Source: 2024 LTED Matrix town codes; 080=Rochester per SRS_LTED_WEIGHT_SOURCE.md
// Extend as needed when new town codes appear
const TOWN_CODE_TO_CITY: Record<string, string> = {
  "005": "BRIGHTON",
  "010": "CHILI",
  "015": "CLARKSON",
  "017": "CLARKSON", // ED 17 may share town
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

function getCityTown(townCode: string): string {
  const normalized = String(townCode ?? "").trim();
  const city = TOWN_CODE_TO_CITY[normalized];
  if (city) return city;
  // Fallback: use code as-is (may not match CommitteeList; log warning)
  console.warn(
    `Unknown town code "${townCode}" - using as cityTown (may not match CommitteeList)`,
  );
  return normalized.toUpperCase() || "UNKNOWN";
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
  const workbook = xlsx.read(fileBuffer);
  // eslint-disable-next-line @typescript-eslint/dot-notation -- sheet name from Matrix; xlsx types use index signature
  const sheet =
    workbook.Sheets["NEW_LTED_Matrix"] ??
    workbook.Sheets[workbook.SheetNames[0]!];

  if (!sheet) {
    throw new Error("Sheet NEW_LTED_Matrix not found");
  }

  const rows = xlsx.utils.sheet_to_json<Record<string, string | number>>(sheet);
  const records: Array<{
    cityTown: string;
    legDistrict: number;
    electionDistrict: number;
    stateAssemblyDistrict: string;
    stateSenateDistrict: string | null;
    congressionalDistrict: string | null;
    countyLegDistrict: string | null;
  }> = [];

  for (const row of rows) {
    const lted = String(row.LTED ?? "").trim();
    const ward = String(row.ward ?? row.Ward ?? "").trim();
    const district = String(row.district ?? row.District ?? "").trim();
    const town = String(row.town ?? row.Town ?? "").trim();
    const stlegDist = String(row.stleg_dist ?? "").trim();
    const stsenDist =
      row.stsen_dist != null ? String(row.stsen_dist).trim() : "";
    const congDist = row.cong_dist != null ? String(row.cong_dist).trim() : "";
    const othrDist1 =
      row.othr_dist1 != null ? String(row.othr_dist1).trim() : null;

    if (!lted || !ward || !district || !town || !stlegDist) {
      console.warn(
        `Skipping incomplete row: LTED=${lted}, ward=${ward}, district=${district}, town=${town}`,
      );
      continue;
    }

    const legDistrict = parseInt(ward.replace(/^0+/, "") || "0", 10);
    const electionDistrict = parseInt(district.replace(/^0+/, "") || "0", 10);

    if (isNaN(legDistrict) || isNaN(electionDistrict)) {
      console.warn(
        `Skipping invalid LD/ED: ward=${ward}, district=${district}`,
      );
      continue;
    }

    records.push({
      cityTown: getCityTown(town),
      legDistrict,
      electionDistrict,
      stateAssemblyDistrict: stlegDist,
      stateSenateDistrict: stsenDist || null,
      congressionalDistrict: congDist || null,
      countyLegDistrict: othrDist1 ?? null,
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
