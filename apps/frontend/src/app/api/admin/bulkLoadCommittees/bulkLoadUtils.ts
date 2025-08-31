/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import prisma from "~/lib/prisma";
import * as xlsx from "xlsx";
import * as fs from "fs";
import type { Prisma } from "@prisma/client";

import {
  type DiscrepanciesAndCommittee,
  findDiscrepancies,
} from "../../lib/utils";

const committeeData = new Map<
  string,
  { data: Prisma.CommitteeListCreateManyInput; committeeMembers: string[] }
>();

export async function loadCommitteeLists() {
  const filePath = "data/Committee-File-2025-05-15.xlsx";
  // const filePath = "data/DemocraticCommitteeExport.xlsx";

  const fileBuffer = fs.readFileSync(filePath);
  const workbook: xlsx.WorkBook = xlsx.read(fileBuffer);

  // const committeeExportSheet: xlsx.WorkSheet | undefined =
  //   workbook.Sheets.Export_to_Excel;

  const committeeExportSheet: xlsx.WorkSheet | undefined =
    workbook.Sheets[workbook.SheetNames[0]];

  if (!committeeExportSheet) {
    throw new Error("Committee export sheet not found");
  }

  const unkownCommitteeData: unknown[] =
    xlsx.utils.sheet_to_json(committeeExportSheet);

  const committeeExportData = unkownCommitteeData as Record<string, string>[];

  let count = 0;
  let found = 0;
  let foundDiscrepancy = 0;
  const discrepanciesMap = new Map<string, DiscrepanciesAndCommittee>();

  for (const row of committeeExportData) {
    // let city = row["LT Description"]?.includes("City")
    //   ? "Rochester"
    //   : row["LT Description"];

    // city = city?.toUpperCase();

    // const legDistrict = Number(row.LT);
    // const electionDistrict = Number(row.ED);
    let city = row.Committee?.includes("LD ") ? "Rochester" : row.Committee;

    city = city?.toUpperCase();

    const legDistrict = Number(row["Serve LT"]);
    const electionDistrict = Number(row["Serve ED"]);
    const VRCNUM = row["voter id"];

    if (!VRCNUM) {
      throw new Error("VRCNUM is undefined");
    }

    if (!city || !legDistrict || !electionDistrict) {
      throw new Error("Invalid committee data");
    }

    const existingRecord = await prisma.voterRecord.findUnique({
      where: {
        VRCNUM,
      },
    });

    count++;
    let recordHasDiscrepancies = false;
    if (existingRecord) {
      found++;
      const discrepancies = findDiscrepancies(row, existingRecord);

      if (discrepancies && Object.keys(discrepancies).length > 0) {
        discrepanciesMap.set(VRCNUM, {
          discrepancies,
          committee: {
            id: 0,
            cityTown: city,
            legDistrict,
            electionDistrict,
          },
        });
        foundDiscrepancy++;
        recordHasDiscrepancies = true;
      }
    } else {
      discrepanciesMap.set(VRCNUM, {
        discrepancies: {
          VRCNUM: { incoming: VRCNUM, existing: "", fullRow: row },
        },
        committee: {
          id: 0,
          cityTown: city,
          legDistrict,
          electionDistrict,
        },
      });
    }

    const mapKey = `${city}-${legDistrict}-${electionDistrict}`;

    if (!city || !legDistrict || !electionDistrict) {
      throw new Error("Invalid committee data");
    }

    if (committeeData.has(mapKey) && !recordHasDiscrepancies) {
      committeeData.get(mapKey)?.committeeMembers.push(VRCNUM);
    } else {
      committeeData.set(mapKey, {
        data: {
          cityTown: city,
          legDistrict: legDistrict,
          electionDistrict: electionDistrict,
        },
        committeeMembers: recordHasDiscrepancies ? [] : [VRCNUM],
      });
    }
  }

  await prisma.committeeList.deleteMany({});

  for (const [, value] of committeeData.entries()) {
    const committeeList = value.data;

    const committee = await prisma.committeeList.upsert({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: committeeList.cityTown,
          legDistrict: committeeList.legDistrict,
          electionDistrict: committeeList.electionDistrict,
        },
      },
      create: committeeList,
      update: committeeList,
    });

    await prisma.voterRecord.updateMany({
      where: {
        VRCNUM: {
          in: value.committeeMembers,
        },
      },
      data: {
        committeeId: committee.id,
      },
    });
  }

  console.log(
    "Loaded",
    count,
    "records and found",
    found,
    "alread saved. Found discrepancies:",
    foundDiscrepancy,
    "discrepancies:",
    discrepanciesMap.size,
  );

  return discrepanciesMap;
}
