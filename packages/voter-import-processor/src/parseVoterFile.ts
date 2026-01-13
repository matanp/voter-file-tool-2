// Core voter file parsing logic

import { Readable } from "stream";
import { createReadStream } from "fs";
import csv from "csv-parser";
import type { PrismaClient, Prisma } from "@prisma/client";
import type { ParseResult, VoterRecordArchiveStrings } from "./types";
import {
  exampleVoterRecord,
  transformVoterRecord,
  bulkSaveVoterRecords,
} from "./voterRecordProcessor";
import {
  processRecordForDropdownLists,
  bulkSaveDropdownLists,
  clearDropdownLists,
} from "./dropdownListProcessor";

const PRINT_COUNT = 100000;
const BUFFER_SIZE = 5000; // Reduced from 25000 for lower memory usage

/**
 * Clean up existing records from the database for a specific year and entry number
 */
async function cleanupDB(
  year: number,
  recordEntryNumber: number,
  prisma: PrismaClient,
) {
  const deletedRecords = await prisma.voterRecordArchive.deleteMany({
    where: {
      recordEntryYear: year,
      recordEntryNumber,
    },
  });

  return { archive: deletedRecords.count, voterRecords: 0 };
}

/**
 * Parse voter file from a Buffer (for R2/S3 uploads)
 */
export async function parseVoterFileFromBuffer(
  buffer: Buffer,
  year: number,
  recordEntryNumber: number,
  prisma: PrismaClient,
): Promise<ParseResult> {
  // Convert Buffer to Readable stream
  const stream = Readable.from(buffer);
  return parseVoterFileFromStream(stream, year, recordEntryNumber, prisma);
}

/**
 * Parse voter file from a file path (for local file system access)
 */
export async function parseVoterFileFromPath(
  filePath: string,
  year: number,
  recordEntryNumber: number,
  prisma: PrismaClient,
): Promise<ParseResult> {
  const stream = createReadStream(filePath);
  return parseVoterFileFromStream(stream, year, recordEntryNumber, prisma);
}

/**
 * Parse voter file from a Readable stream
 * Core parsing logic shared by both buffer and path-based parsing
 */
export async function parseVoterFileFromStream(
  stream: Readable,
  year: number,
  recordEntryNumber: number,
  prisma: PrismaClient,
): Promise<ParseResult> {
  // Clean up existing data
  const { archive, voterRecords } = await cleanupDB(
    year,
    recordEntryNumber,
    prisma,
  );
  console.log(
    "Deleted",
    archive,
    "archives and",
    voterRecords,
    "voter records",
  );

  // Clear dropdown lists for fresh start
  clearDropdownLists();

  // Statistics tracking
  let count = 0;
  let totalCreated = 0;
  let totalUpdated = 0;

  // Buffer for batch processing
  let recordBuffer: Prisma.VoterRecordArchiveCreateManyInput[] = [];

  return new Promise((resolve, reject) => {
    const parser = stream.pipe(csv(Object.keys(exampleVoterRecord)));

    const processRow = async (row: VoterRecordArchiveStrings) => {
      if (row) {
        parser.pause();
        try {
          const voterRecord = transformVoterRecord(row, year, recordEntryNumber);
          if (voterRecord) {
            recordBuffer.push(voterRecord);
          }

          count++;
          if (count % PRINT_COUNT === 0) {
            console.log("Processed", count, "records");
          }

          // Process for dropdown lists
          if (row.city) {
            processRecordForDropdownLists(row);
          }

          // Save batch when buffer is full
          if (recordBuffer.length >= BUFFER_SIZE) {
            const stats = await bulkSaveVoterRecords(recordBuffer, prisma);
            totalCreated += stats.created;
            totalUpdated += stats.updated;
            recordBuffer = [];
          }

          parser.resume();
        } catch (error) {
          reject(error);
        }
      }
    };

    parser.on("data", (row: VoterRecordArchiveStrings) => {
      processRow(row).catch((error) => {
        console.error("Error processing row:", error);
        reject(error);
      });
    });

    parser.on("end", async () => {
      console.log("Parsing complete, saving remaining records...");

      try {
        // Save remaining records in buffer
        if (recordBuffer.length > 0) {
          const stats = await bulkSaveVoterRecords(recordBuffer, prisma);
          totalCreated += stats.created;
          totalUpdated += stats.updated;
        }

        // Save dropdown lists
        await bulkSaveDropdownLists(prisma);

        const result: ParseResult = {
          recordsProcessed: count,
          recordsCreated: totalCreated,
          recordsUpdated: totalUpdated,
          dropdownsUpdated: true,
        };

        console.log("Import complete:", result);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    parser.on("error", (error) => {
      reject(error);
    });
  });
}
