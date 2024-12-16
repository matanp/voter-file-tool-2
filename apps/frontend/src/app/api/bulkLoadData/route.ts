import { createReadStream } from "fs";
import prisma from "~/lib/prisma";
import csv from "csv-parser";
import * as xlsx from "xlsx";
import * as fs from "fs";
import type { Prisma, VoterRecordArchive } from "@prisma/client";
import {
  convertStringToDateTime,
  Discrepancy,
  type DropdownItem,
  dropdownItems,
  exampleVoterRecord,
  fieldEnum,
  findDiscrepancies,
  isRecordNewer,
} from "../lib/utils";
import { NextResponse } from "next/server";

type VoterRecordArchiveStrings = {
  [K in keyof VoterRecordArchive]: string | null;
};

function isKeyOfVoterRecordArchiveStrings(
  key: string,
): key is keyof VoterRecordArchive {
  return key in exampleVoterRecord;
}

const cleanupDB = async (year: number, recordEntryNumber: number) => {
  // :TODO: Implement early exit if deleting records
  const deletedRecords = await prisma.voterRecordArchive.deleteMany({
    where: {
      recordEntryYear: year,
      recordEntryNumber,
    },
  });

  //   const deletedVoterRecords = await prisma.voterRecord.deleteMany({
  //     where: {
  //       latestRecordEntryYear: year,
  //       latestRecordEntryNumber: recordEntryNumber,
  //     },
  //   });

  return { archive: deletedRecords.count, voterRecords: 0 };
};

let count = 0;
const PRINT_COUNT = 100000;
const BUFFER_SIZE = 25000;

async function parseCSV(
  filePath: string,
  year: number,
  recordEntryNumber: number,
): Promise<void> {
  const { archive, voterRecords } = await cleanupDB(year, recordEntryNumber);
  console.log(
    "Deleted",
    archive,
    "archives and",
    voterRecords,
    "voter records",
  );

  return new Promise((resolve, reject) => {
    const parser = createReadStream(filePath).pipe(
      csv(Object.keys(exampleVoterRecord)),
    );

    const processRow = async (row: VoterRecordArchiveStrings) => {
      if (row) {
        parser.pause();
        await saveVoterRecord(row, year, recordEntryNumber).catch(reject);
        count++;
        if (count % PRINT_COUNT === 0) {
          console.log("Saved", count, "records");
        }
        parser.resume();
      }
    };

    parser.on("data", (row: VoterRecordArchiveStrings) => {
      processRow(row).catch((error) => {
        console.error("Error processing row:", error);
        reject(error);
      });
    });

    parser.on("end", () => {
      console.log("Parsing complete");
      count = 0;

      bulkSaveAll()
        .then(() => {
          resolve();
        })
        .catch(reject);
    });

    parser.on("error", (error) => {
      // throw error;
      reject(error);
    });
  });
}

let voterRercordArchiveBuffer: Prisma.VoterRecordArchiveCreateManyInput[] = [];
let committeeLists: Prisma.CommitteeListCreateManyInput[] = [];
let committeeData: Map<
  string,
  { data: Prisma.CommitteeListCreateManyInput; committeeMembers: string[] }
> = new Map();
let committeeLists2: Prisma.CommitteeListCreateManyInput[] = [];
const dropdownLists = new Map<DropdownItem, Set<string>>();

function processRecordForDropdownLists(record: VoterRecordArchiveStrings) {
  for (const key of dropdownItems) {
    if (!isKeyOfVoterRecordArchiveStrings(key)) {
      continue;
    }

    const value = record[key]?.trim();
    if (value) {
      if (!dropdownLists.get(key)) {
        dropdownLists.set(key, new Set());
      }

      if (!dropdownLists.get(key)?.has(value)) {
        dropdownLists.set(key, dropdownLists.get(key)!.add(value));
      }
    }
  }
}

function hasRequiredVoterArchiveFields(
  record: Partial<Prisma.VoterRecordArchiveCreateManyInput>,
): record is Prisma.VoterRecordArchiveCreateManyInput {
  return (
    typeof record.VRCNUM === "string" &&
    typeof record.recordEntryYear === "number" &&
    typeof record.recordEntryNumber === "number"
  );
}

async function saveVoterRecord(
  record: VoterRecordArchiveStrings,
  year: number,
  recordEntryNumber: number,
): Promise<void> {
  const VRCNUM = record.VRCNUM;

  if (VRCNUM === undefined) {
    throw new Error("VRCNUM is undefined");
  }

  let voterRecord: Partial<Prisma.VoterRecordArchiveCreateManyInput> = {
    recordEntryYear: year,
    recordEntryNumber,
  };

  for (const key of Object.keys(exampleVoterRecord)) {
    const parseKey = fieldEnum.safeParse(key);
    if (!parseKey.success) {
      console.log("Error parsing field", key);
      continue;
    }

    const value = record[parseKey.data];

    if (key === "houseNum" || key === "electionDistrict") {
      voterRecord = {
        ...voterRecord,
        [key]: Number(value ?? -1),
      };
    } else if (
      key === "DOB" ||
      key === "lastUpdate" ||
      key === "originalRegDate"
    ) {
      voterRecord = {
        ...voterRecord,
        [key]: convertStringToDateTime(value ?? ""),
      };
    } else {
      voterRecord = {
        ...voterRecord,
        [key]: value?.trim() ?? "",
      };
    }
  }

  if (hasRequiredVoterArchiveFields(voterRecord)) {
    voterRercordArchiveBuffer.push(voterRecord);
  } else {
    console.log("Error saving voter record", voterRecord);
    throw new Error("Missing required fields");
  }

  if (record.city) {
    const committeeList = {
      cityTown: record.city,
      legDistrict:
        record.city === "ROCHESTER" ? Number(record.countyLegDistrict) : -1,
      electionDistrict: Number(record.electionDistrict),
    };

    if (
      committeeLists.find(
        (list) =>
          list.cityTown === committeeList.cityTown &&
          list.electionDistrict === committeeList.electionDistrict &&
          list.legDistrict === committeeList.legDistrict,
      ) === undefined
    ) {
      committeeLists.push(committeeList);
    }

    processRecordForDropdownLists(record);
  }

  if (voterRercordArchiveBuffer.length >= BUFFER_SIZE) {
    await bulkSaveVoterRecords();
  }
}

const bulkSaveAll = async () => {
  // await bulkSaveCommitteeLists();
  await bulkSaveDropdownLists();

  if (voterRercordArchiveBuffer.length > 0) {
    await bulkSaveVoterRecords();
  }
};

const bulkSaveVoterRecords = async () => {
  // console.log("Bulk saving voter records", voterRercordArchiveBuffer.length);
  console.time("bulkSaveVoterRecords");
  if (voterRercordArchiveBuffer.length > 0) {
    // console.time("bulkSaveVoterArchiveRecords");
    await prisma.voterRecordArchive.createMany({
      data: voterRercordArchiveBuffer,
    });
    // console.timeEnd("bulkSaveVoterArchiveRecords");
  }

  // console.time("findVoterRecords");
  const existingRecords = await prisma.voterRecord.findMany({
    where: {
      VRCNUM: {
        in: voterRercordArchiveBuffer.map((record) => record.VRCNUM),
      },
    },
  });

  const existingRecordMap = new Map(
    existingRecords.map((record) => [record.VRCNUM, record]),
  );

  // console.timeEnd("findVoterRecords");

  const voterCreateTransactions: Prisma.VoterRecordCreateManyInput[] = [];
  const voterUpdateTransactions: Prisma.VoterRecordUpdateManyArgs[] = [];

  // console.log("Processing records", voterRercordArchiveBuffer.length);
  // console.time("processingRecords");
  for (const record of voterRercordArchiveBuffer) {
    const existingRecord = existingRecordMap.get(record.VRCNUM);

    const { recordEntryYear, recordEntryNumber, VRCNUM, ...otherRecordFields } =
      record;

    if (existingRecord && isRecordNewer(record, existingRecord)) {
      voterUpdateTransactions.push({
        where: {
          VRCNUM: record.VRCNUM,
        },
        data: {
          ...otherRecordFields,
          latestRecordEntryNumber: recordEntryNumber,
          latestRecordEntryYear: recordEntryYear,
          hasDiscrepancy: false,
        },
      });
    } else if (existingRecord === undefined) {
      voterCreateTransactions.push({
        ...otherRecordFields,
        VRCNUM,
        latestRecordEntryNumber: recordEntryNumber,
        latestRecordEntryYear: recordEntryYear,
        hasDiscrepancy: false,
      });
    }
  }
  // console.timeEnd("processingRecords");

  // console.log(
  //   "update:",
  //   voterUpdateTransactions.length,
  //   "create:",
  //   voterCreateTransactions.length,
  // );
  // console.time("update many voter records");
  const voterUpdateMany = voterUpdateTransactions.map((transaction) => {
    return prisma.voterRecord.updateMany(transaction);
  });

  await Promise.all(voterUpdateMany);
  // console.timeEnd("update many voter records");

  // console.time("create many voter records");
  await prisma.voterRecord.createMany({
    data: voterCreateTransactions,
  });
  // console.timeEnd("create many voter records");

  console.timeEnd("bulkSaveVoterRecords");
  voterRercordArchiveBuffer = [];
};

export async function POST(req: Request) {
  console.log("Loading data BULK");
  console.time("loadData");
  // const body: Request = await req.json();

  // console.log(body);

  try {
    // const filePath = "data/2023-2.txt";
    // const year = 2023;
    // const recordEntryNumber = 2;

    // const files = [
    //   "2023-1-partial.txt",
    //   "2023-2-partial.txt",
    //   "2023-3-partial.txt",
    //   "2024-1-partial.txt",
    // ];

    // const years = [2023, 2023, 2023, 2024];
    // const recordEntryNumbers = [1, 2, 3, 1];

    // const files = ["2024_4_voter_records-partial5000.txt"];
    // const files = ["2024_1_voter_records.txt"];
    // const files = ["2024_5_2_voter_records.txt"];
    // const files = ["2024_1_voter_records-partial100k.txt"];
    const files: string[] = [];

    const years = [2024];
    const recordEntryNumbers = [1];

    for (let i = 0; i < files.length; i++) {
      console.log(files[i] ?? "", years[i] ?? 0, recordEntryNumbers[i] ?? 0);
      await parseCSV(
        `data/${files[i]}`,
        years[i] ?? 0,
        recordEntryNumbers[i] ?? 0,
      );
    }

    console.log("Parsing complete");
    console.timeEnd("loadData");

    await loadCommitteeLists();

    return NextResponse.json(
      {
        success: true,
        message: "Data loaded successfully.",
        result: "",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error loading data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
        message: "Failed to load data.",
      },
      { status: 500 },
    );
  }
}

async function bulkSaveDropdownLists() {
  const existingDropdownLists = await prisma.dropdownLists.findMany();

  if (existingDropdownLists.length > 1) {
    throw new Error("More than one dropdown list exists");
  }

  const existingLists = existingDropdownLists[0];

  if (existingLists) {
    for (const [key, values] of dropdownLists.entries()) {
      if (existingLists[key]) {
        const existingValues = new Set(existingLists[key]);

        dropdownLists.set(key, new Set([...existingValues, ...values]));
      }
    }
  }

  await prisma.dropdownLists.upsert({
    where: {
      id: existingLists?.id ?? 1,
    },
    create: {
      city: Array.from(dropdownLists.get("city")!).sort(),
      zipCode: Array.from(dropdownLists.get("zipCode")!).sort(),
      street: Array.from(dropdownLists.get("street")!).sort(),
      countyLegDistrict: Array.from(
        dropdownLists.get("countyLegDistrict")!,
      ).sort(),
      stateAssmblyDistrict: Array.from(
        dropdownLists.get("stateAssmblyDistrict")!,
      ).sort(),
      stateSenateDistrict: Array.from(
        dropdownLists.get("stateSenateDistrict")!,
      ).sort(),
      congressionalDistrict: Array.from(
        dropdownLists.get("congressionalDistrict")!,
      ).sort(),
      townCode: Array.from(dropdownLists.get("townCode")!).sort(),
      electionDistrict: Array.from(dropdownLists.get("electionDistrict")!),
      party: Array.from(dropdownLists.get("party")!).sort(),
    },
    update: {
      city: Array.from(dropdownLists.get("city")!),
      zipCode: Array.from(dropdownLists.get("zipCode")!),
      street: Array.from(dropdownLists.get("street")!),
      countyLegDistrict: Array.from(dropdownLists.get("countyLegDistrict")!),
      stateAssmblyDistrict: Array.from(
        dropdownLists.get("stateAssmblyDistrict")!,
      ),
      stateSenateDistrict: Array.from(
        dropdownLists.get("stateSenateDistrict")!,
      ),
      congressionalDistrict: Array.from(
        dropdownLists.get("congressionalDistrict")!,
      ),
      townCode: Array.from(dropdownLists.get("townCode")!),
      electionDistrict: Array.from(dropdownLists.get("electionDistrict")!),
      party: Array.from(dropdownLists.get("party")!),
    },
  });
}

async function bulkSaveCommitteeLists() {
  console.log("Bulk saving committee lists");
  console.time("bulkSaveCommitteeLists");
  const committeeDBTransactions = committeeLists.map((committeeList) => {
    return prisma.committeeList.upsert({
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
  });

  const committeeDBResults = await prisma.$transaction(committeeDBTransactions);

  committeeLists = [];

  console.log("Committee DB results", committeeDBResults.length);
  console.timeEnd("bulkSaveCommitteeLists");

  return committeeDBResults.length;
}

export async function loadCommitteeLists() {
  const filePath = "data/DemocraticCommitteeExport.xlsx";

  const fileBuffer = fs.readFileSync(filePath);
  const workbook: xlsx.WorkBook = xlsx.read(fileBuffer);

  const committeeExportSheet: xlsx.WorkSheet | undefined =
    workbook.Sheets.Export_to_Excel;

  if (!committeeExportSheet) {
    throw new Error("Committee export sheet not found");
  }

  const unkownCommitteeData: unknown[] =
    xlsx.utils.sheet_to_json(committeeExportSheet);

  const committeeExportData = unkownCommitteeData as Record<string, string>[];

  let count = 0;
  let found = 0;
  let foundDiscrepancy = 0;
  const discrepanciesMap = new Map<string, Discrepancy>();

  for (const row of committeeExportData) {
    const city = row["LT Description"]?.includes("City")
      ? "Rochester"
      : row["LT Description"];

    const legDistrict = Number(row.LT);
    const electionDistrict = Number(row.ED);

    const VRCNUM = row["voter id"];

    if (!VRCNUM) {
      throw new Error("VRCNUM is undefined");
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
        discrepanciesMap.set(VRCNUM, discrepancies);
        foundDiscrepancy++;
        recordHasDiscrepancies = true;
      }
    } else {
      discrepanciesMap.set(VRCNUM, {
        VRCNUM: { incoming: VRCNUM, existing: "", fullRow: row },
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
        committeeMembers: recordHasDiscrepancies ? [VRCNUM] : [],
      });
    }
  }

  for (const [key, value] of committeeData.entries()) {
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

  committeeLists2 = [];

  return discrepanciesMap;
}
