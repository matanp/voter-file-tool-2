import { z } from 'zod';
import { generateDesignatedPetitionDataSchema } from './designatedPetition';
import { partialVoterRecordSchema } from './voterRecord';
import {
  NUMBER_FIELDS,
  COMPUTED_BOOLEAN_FIELDS,
  DATE_FIELDS,
  STRING_FIELDS,
} from '../constants';
import { voterImportJobDataSchema } from '../voterImport';

// Discriminated union schemas for each field type
const numberFieldSchema = z.object({
  field: z.enum(NUMBER_FIELDS),
  values: z
    .array(z.number().nullable())
    .min(1, 'At least one value is required'),
});

const computedBooleanFieldSchema = z.object({
  field: z.enum(COMPUTED_BOOLEAN_FIELDS),
  // Only allow true | null; false should be treated as absence
  value: z.literal(true).nullable(),
});

const stringFieldSchema = z.object({
  field: z.enum(STRING_FIELDS),
  values: z
    .array(z.string().nullable())
    .min(1, 'At least one value is required'),
});

// Date field with values array
const dateValuesFieldSchema = z.object({
  field: z.enum(DATE_FIELDS),
  values: z
    .array(z.string().datetime().nullable())
    .min(1, 'At least one value is required'),
});

// Date field with range object
const dateRangeFieldSchema = z
  .object({
    field: z.enum(DATE_FIELDS),
    range: z.object({
      startDate: z.string().datetime().nullable(),
      endDate: z.string().datetime().nullable(),
    }),
  })
  .refine((data) => !('values' in data), {
    message: 'Date range fields cannot have values property',
  });

// Union of date field types
const dateFieldSchema = z.union([dateValuesFieldSchema, dateRangeFieldSchema]);

// Search query field schema using union with proper discrimination
// Order matters: more specific schemas first
export const searchQueryFieldSchema = z.union([
  dateRangeFieldSchema, // Most specific - has 'range' property
  dateValuesFieldSchema, // Has 'values' property
  computedBooleanFieldSchema, // Has 'value' property
  numberFieldSchema, // Has 'values' property
  stringFieldSchema, // Has 'values' property
]);

// Shared XLSX configuration schema
export const xlsxConfigSchema = z
  .object({
    // Whether to include compound name and address fields
    includeCompoundFields: z
      .object({
        name: z.boolean().optional().default(true),
        address: z.boolean().optional().default(true),
      })
      .optional()
      .default({ name: true, address: true }),
    // Column order (if not specified, uses default order)
    columnOrder: z.array(z.string()).optional(),
    // Custom column headers (if not specified, uses field names)
    columnHeaders: z.record(z.string()).optional(),
  })
  .optional();

// Base API schema for common fields
export const baseApiSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

// Individual report type schemas
const designatedPetitionReportSchema = z.object({
  type: z.literal('designatedPetition'),
  ...baseApiSchema.shape,
  format: z.literal('pdf'),
  payload: generateDesignatedPetitionDataSchema,
});

// Committee selection criteria schema
const committeeSelectionSchema = z.object({
  // If provided, only include committees from these city/town combinations
  cityTownFilters: z.array(z.string()).optional(),
  // If provided, only include committees from these legislative districts
  legDistrictFilters: z.array(z.number()).optional(),
  // If provided, only include committees from these election districts
  electionDistrictFilters: z.array(z.number()).optional(),
  // If true, include all committees (default behavior)
  includeAll: z.boolean().optional().default(true),
});

const ldCommitteesReportSchema = z.object({
  type: z.literal('ldCommittees'),
  ...baseApiSchema.shape,
  format: z.enum(['pdf', 'xlsx']),
  // Optional field to specify which VoterRecord fields to include
  includeFields: z.array(z.string()).optional().default([]),
  // XLSX-specific configuration (only applies when format is 'xlsx')
  xlsxConfig: xlsxConfigSchema,
});

const voterListReportSchema = z.object({
  type: z.literal('voterList'),
  ...baseApiSchema.shape,
  format: z.literal('xlsx'),
  searchQuery: z.array(searchQueryFieldSchema),
  includeFields: z.array(z.string()).optional().default([]),
  xlsxConfig: xlsxConfigSchema,
});

const absenteeReportSchema = z.object({
  type: z.literal('absenteeReport'),
  format: z.literal('xlsx'),
  ...baseApiSchema.shape,
  csvFileKey: z.string().min(1, 'CSV file key is required'),
});

const voterImportReportSchema = z.object({
  type: z.literal('voterImport'),
  format: z.literal('txt'),
  ...baseApiSchema.shape,
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

// Internal worker job schema (2.8). Not exposed in generateReportSchema.
const boeEligibilityFlaggingReportSchema = z.object({
  type: z.literal('boeEligibilityFlagging'),
  format: z.literal('txt'),
  ...baseApiSchema.shape,
  termId: z.string().min(1).optional(),
  sourceReportId: z.string().cuid('Source report ID must be a valid CUID').optional(),
});

// Generate Report Schema - discriminated union for different report types
export const generateReportSchema = z.discriminatedUnion('type', [
  designatedPetitionReportSchema,
  ldCommitteesReportSchema,
  voterListReportSchema,
  absenteeReportSchema,
  voterImportReportSchema,
]);

// Additional fields for enriched report data
const enrichedFieldsSchema = z.object({
  reportAuthor: z.string().min(1, 'Report author is required'),
  jobId: z.string().cuid('Job ID must be a valid CUID'),
});

// Enriched report data that extends the generate report schema with additional fields
export const enrichedReportDataSchema = z.discriminatedUnion('type', [
  z.object({
    ...designatedPetitionReportSchema.shape,
    ...enrichedFieldsSchema.shape,
  }),
  z.object({
    ...ldCommitteesReportSchema.shape,
    ...enrichedFieldsSchema.shape,
  }),
  z.object({
    ...voterListReportSchema.shape,
    ...enrichedFieldsSchema.shape,
  }),
  z.object({
    ...absenteeReportSchema.shape,
    ...enrichedFieldsSchema.shape,
  }),
  z.object({
    ...voterImportReportSchema.shape,
    ...enrichedFieldsSchema.shape,
  }),
  z.object({
    ...boeEligibilityFlaggingReportSchema.shape,
    ...enrichedFieldsSchema.shape,
  }),
]);

// Voter import metadata schema (reusable)
export const voterImportMetadataSchema = z.object({
  recordsProcessed: z.number(),
  recordsCreated: z.number(),
  recordsUpdated: z.number(),
  dropdownsUpdated: z.boolean(),
});

// Report complete webhook payload schema
export const reportCompleteWebhookPayloadSchema = z.object({
  success: z.boolean(),
  jobId: z.string().cuid('Job ID must be a valid CUID'),
  type: z.string().optional(),
  url: z.string().optional(),
  error: z.string().optional(),
  metadata: voterImportMetadataSchema.optional(),
});

// API response schemas
export const generateReportResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  numJobs: z.number().int().min(0, 'Number of jobs must be non-negative'),
});

// Frontend transformed response schema
export const generateReportFrontendResponseSchema = z.object({
  reportId: z.string().cuid('Report ID must be a valid CUID'),
  jobsAhead: z.number().int().min(0, 'Jobs ahead must be non-negative'),
});

export const reportCompleteResponseSchema = z.object({
  received: z.boolean(),
  skipped: z.boolean().optional(),
});

// Error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.unknown().optional(),
  details: z.array(z.any()).optional(),
  issues: z.array(z.any()).optional(),
});

// Utility type to extract field names from SearchQueryField
export type SearchableFieldName = SearchQueryField['field'];

// Utility type to get the value type for a specific field
export type FieldValueType<T extends SearchableFieldName> =
  T extends (typeof NUMBER_FIELDS)[number]
    ? number | null
    : T extends (typeof COMPUTED_BOOLEAN_FIELDS)[number]
      ? true | null
      : T extends (typeof DATE_FIELDS)[number]
        ? string | null | { startDate: string | null; endDate: string | null }
        : T extends (typeof STRING_FIELDS)[number]
          ? string | null
          : never;

// Type exports
export type GenerateReportData = z.infer<typeof generateReportSchema>;
export type EnrichedReportData = z.infer<typeof enrichedReportDataSchema>;
export type VoterImportMetadata = z.infer<typeof voterImportMetadataSchema>;
export type ReportCompleteWebhookPayload = z.infer<
  typeof reportCompleteWebhookPayloadSchema
>;
export type GenerateReportResponse = z.infer<
  typeof generateReportResponseSchema
>;
export type GenerateReportFrontendResponse = z.infer<
  typeof generateReportFrontendResponseSchema
>;
export type ReportCompleteResponse = z.infer<
  typeof reportCompleteResponseSchema
>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type SearchQueryField = z.infer<typeof searchQueryFieldSchema>;
export type CommitteeSelection = z.infer<typeof committeeSelectionSchema>;
