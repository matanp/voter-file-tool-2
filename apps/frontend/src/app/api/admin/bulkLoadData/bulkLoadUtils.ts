import { createReadStream } from "fs";
import prisma from "~/lib/prisma";
import csv from "csv-parser";
import type { Prisma, VoterRecordArchive } from "@prisma/client";

import {
  exampleVoterRecord,
  type DropdownItem,
  dropdownItems,
  fieldEnum,
  convertStringToDateTime,
  isRecordNewer,
} from "../../lib/utils";

type VoterRecordArchiveStrings = {
  [K in keyof VoterRecordArchive]: string | null;
};

function isKeyOfVoterRecordArchiveStrings(
  key: string,
): key is keyof VoterRecordArchive {
  return key in exampleVoterRecord;
}

export const cleanupDB = async (year: number, recordEntryNumber: number) => {
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

export async function parseCSV(
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
      reject(error);
    });
  });
}

let voterRercordArchiveBuffer: Prisma.VoterRecordArchiveCreateManyInput[] = [];

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

    const value = record[parseKey.data as keyof VoterRecordArchiveStrings];

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
    processRecordForDropdownLists(record);
  }

  if (voterRercordArchiveBuffer.length >= BUFFER_SIZE) {
    await bulkSaveVoterRecords();
  }
}

const bulkSaveAll = async () => {
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
