// Voter import validation schema and types
import { z } from 'zod';

/**
 * Voter import job data schema
 * Defines the metadata required for processing a voter file upload
 */
export const voterImportJobDataSchema = z.object({
  fileKey: z.string().min(1, 'File key is required'),
  fileName: z.string().min(1, 'File name is required'),
  year: z
    .number()
    .int()
    .min(2000)
    .max(2100, 'Year must be between 2000 and 2100'),
  recordEntryNumber: z
    .number()
    .int()
    .min(1, 'Record entry number must be at least 1'),
});

export type VoterImportJobData = z.infer<typeof voterImportJobDataSchema>;

/**
 * Voter import result statistics
 */
export interface VoterImportResult {
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  dropdownsUpdated: boolean;
}
