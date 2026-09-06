import { z } from 'zod';

/**
 * Every roster file format the importer knows, as the API contract states them. This
 * tuple is the contract: the frontend's parser registry pins its keys to it, so adding a
 * parser without naming it here (or naming one here without a parser) is a compile error.
 *
 * Whether a given format may be imported through the API is a separate question — the
 * registry records that as the format's status, and the endpoint rejects archived ones.
 */
export const ROSTER_FORMAT_IDS = [
  'boe-elected-list',
  'committee-export-xlsx',
] as const;

export type RosterFormatId = (typeof ROSTER_FORMAT_IDS)[number];

export const rosterFormatIdSchema = z.enum(ROSTER_FORMAT_IDS);

/**
 * The bulk committee roster import request. The Admin states the format rather than the
 * system guessing it, names the file within the local data directory, and says whether to
 * write. `dryRun` defaults to the safe answer: an operator who omits it gets a plan.
 */
export const bulkLoadCommitteesSchema = z.object({
  format: rosterFormatIdSchema,
  fileName: z.string().trim().min(1, 'File name is required'),
  dryRun: z.boolean().default(true),
});

export type BulkLoadCommitteesRequest = z.infer<typeof bulkLoadCommitteesSchema>;
