import { type NextApiRequest, type NextApiResponse } from "next";
import { createReadStream } from "fs";
import prisma from "~/lib/prisma";
import csv from "csv-parser";
import { type VoterRecordArchive } from "@prisma/client";
import {
  convertStringToDateTime,
  exampleVoterRecord,
  fieldEnum,
  isRecordNewer,
  voterHasDiscrepancy,
} from "../lib/utils";
import { NextRequest, NextResponse } from "next/server";

type VoterRecordArchiveStrings = {
  [K in keyof VoterRecordArchive]: string | null;
};

let count = 0;
let PRINT_COUNT = 250;

function parseCSV(
  filePath: string,
  year: number,
  recordEntryNumber: number,
): Promise<void> {
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
      resolve();
    });

    parser.on("error", (error) => {
      // throw error;
      reject(error);
    });
  });
}

async function saveVoterRecord(
  record: VoterRecordArchiveStrings,
  year: number,
  recordEntryNumber: number,
): Promise<void> {
  const VRCNUM = Number(record.VRCNUM);

  if (VRCNUM === undefined) {
    throw new Error("VRCNUM is undefined");
  }

  let existingRecord = await prisma.voterRecordArchive.findUnique({
    where: {
      VRCNUM_recordEntryYear_recordEntryNumber: {
        VRCNUM,
        recordEntryYear: year,
        recordEntryNumber,
      },
    },
  });

  if (record.city) {
    const committeeList = await prisma.committeeList.findUnique({
      where: {
        cityTown_legDistrict_electionDistrict: {
          cityTown: record.city,
          legDistrict: Number(record.countyLegDistrict),
          electionDistrict: Number(record.electionDistrict),
        },
      },
    });

    if (!committeeList) {
      await prisma.committeeList.create({
        data: {
          cityTown: record.city,
          legDistrict: Number(record.countyLegDistrict),
          electionDistrict: Number(record.electionDistrict),
        },
      });
    }
  }

  if (!existingRecord) {
    let voterRecord = {
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

      // const value = record[key];
      // const value = record[key]?.trim();
      if (
        key === "VRCNUM" ||
        key === "houseNum" ||
        key === "electionDistrict"
      ) {
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
          [key]: value ?? "",
        };
      }
    }

    existingRecord = await prisma.voterRecordArchive.create({
      data: voterRecord as VoterRecordArchive,
    });
  }

  const voterRecord = await prisma.voterRecord.findUnique({
    where: {
      VRCNUM,
    },
  });

  // const hasDiscrepancy = await voterHasDiscrepancy(VRCNUM);
  const hasDiscrepancy = false;
  if (!voterRecord || isRecordNewer(existingRecord, voterRecord)) {
    const { id, recordEntryYear, recordEntryNumber, ...otherRecordFields } =
      existingRecord;
    await prisma.voterRecord.upsert({
      where: {
        VRCNUM,
      },
      create: {
        ...otherRecordFields,
        latestRecordEntryNumber: recordEntryNumber,
        latestRecordEntryYear: year,
        hasDiscrepancy,
      },
      update: {
        ...otherRecordFields,
        latestRecordEntryNumber: recordEntryNumber,
        latestRecordEntryYear: year,
        hasDiscrepancy,
      },
    });
  }
}

export async function POST(req: Request) {
  console.log("Loading data");
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

    const files = ["2024-1-partial.txt"];

    const years = [2024];
    const recordEntryNumbers = [1];

    for (let i = 0; i < files.length; i++) {
      console.log(files[i] ?? "", years[i] ?? 0, recordEntryNumbers[i] ?? 0);
      await parseCSV(
        `data/${files[i]}` ?? "",
        years[i] ?? 0,
        recordEntryNumbers[i] ?? 0,
      );
    }

    console.log("Parsing complete");
    console.timeEnd("loadData");

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
