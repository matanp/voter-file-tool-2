import { NextApiRequest, NextApiResponse } from "next";
import { createReadStream, readFileSync } from "fs";
import prisma from "~/lib/prisma";
import csv from "csv-parser";
import { VoterRecordArchive } from "@prisma/client";
import {
  convertStringToDateTime,
  exampleVoterRecord,
  isRecordNewer,
  voterHasDiscrepancy,
} from "./lib/utils";

function parseCSV(
  filePath: string,
  year: number,
  recordEntryNumber: number,
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const records: any[] = [];
    const parser = createReadStream(filePath).pipe(
      csv(Object.keys(exampleVoterRecord)),
    );

    parser.on("data", async (row: any) => {
      try {
        await saveVoterRecord(row, year, recordEntryNumber);
      } catch (error) {
        console.error("Error saving voter record:", error);
      }
    });

    parser.on("end", () => {
      console.log("Parsing complete", records.length);
      resolve(records);
    });

    parser.on("error", (error) => {
      throw error;
    });
  });
}

async function saveVoterRecord(
  record: any,
  year: number,
  recordEntryNumber: number,
): Promise<void> {
  const VRCNUM = Number(record["VRCNUM"]);

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

  if (record.electionDistrict) {
    let committeeList = await prisma.electionDistrict.findUnique({
      where: {
        electionDistrict: Number(record.electionDistrict),
      },
    });

    if (!committeeList) {
      await prisma.electionDistrict.create({
        data: {
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

    for (let key of Object.keys(exampleVoterRecord)) {
      const value = record[key]?.trim();
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

  const hasDiscrepancy = await voterHasDiscrepancy(VRCNUM);

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const filePath = "data/2023-2.txt";
    const year = 2023;
    const recordEntryNumber = 2;

    const files = [
      "2023-1-partial.txt",
      "2023-2-partial.txt",
      "2023-3-partial.txt",
      "2024-1-partial.txt",
    ];
    const years = [2023, 2023, 2023, 2024];
    const recordEntryNumbers = [1, 2, 3, 1];

    for (let i = 0; i < files.length; i++) {
      console.log(files[i] ?? "", years[i] ?? 0, recordEntryNumbers[i] ?? 0);
      await parseCSV(
        `data/${files[i]}` ?? "",
        years[i] ?? 0,
        recordEntryNumbers[i] ?? 0,
      );
    }

    console.log("Parsing complete");

    return res.status(200).json({
      success: true,
      message: "Data loaded successfully.",
      result: "",
    });
  } catch (error) {
    console.error("Error loading data:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "Failed to load data.",
    });
  }
}
