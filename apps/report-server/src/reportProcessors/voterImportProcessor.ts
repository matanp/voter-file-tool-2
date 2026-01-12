// Voter import processor for report-server
// Purpose: Process voter file uploads from R2 and import them into the database

import { downloadFileFromR2 } from "../s3Utils";
import {
  parseVoterFileFromBuffer,
  type ParseResult,
} from "@voter-file-tool/voter-import-processor";
import { prisma } from "../lib/prisma";

/**
 * Process voter import job
 * Downloads the voter file from R2 and processes it using the shared processor
 */
export async function processVoterImport(
  fileKey: string,
  year: number,
  recordEntryNumber: number,
  jobId: string,
): Promise<ParseResult> {
  console.log(`Starting voter import for job ${jobId}...`);
  console.log(`File: ${fileKey}, Year: ${year}, Entry: ${recordEntryNumber}`);

  try {
    // Step 1: Download file from R2
    console.log("Downloading voter file from R2...");
    const buffer = await downloadFileFromR2(fileKey);
    console.log(`Downloaded ${buffer.length} bytes`);

    // Step 2: Process the file
    console.log("Processing voter file...");
    const result = await parseVoterFileFromBuffer(
      buffer,
      year,
      recordEntryNumber,
      prisma,
    );

    console.log("Import statistics:", result);

    console.log(`Voter import completed successfully for job ${jobId}`);
    return result;
  } catch (error) {
    console.error(`Error processing voter import for job ${jobId}:`, error);
    throw error;
  }
}
