// Voter import processor for report-server
// Purpose: Process voter file uploads from R2 and import them into the database

import { streamFileFromR2 } from "../s3Utils";
import {
  parseVoterFileFromStream,
  type ParseResult,
} from "@voter-file-tool/voter-import-processor";
import { prisma } from "../lib/prisma";

/**
 * Process voter import job
 * Streams the voter file from R2 and processes it using the shared processor
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
    // Step 1: Stream file from R2 (memory-efficient, no buffering)
    console.log("Streaming voter file from R2...");
    const stream = await streamFileFromR2(fileKey);
    console.log("Stream obtained, beginning processing...");

    // Step 2: Process the file
    console.log("Processing voter file...");
    const result = await parseVoterFileFromStream(
      stream,
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
