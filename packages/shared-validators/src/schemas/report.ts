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

// Shared scope fields used by multiple report types
const scopeFieldsBase = z.object({
  scope: z.enum(['jurisdiction', 'countywide']),
  cityTown: z.string().optional(),
  legDistrict: z.number().optional(),
});

const scopeFieldsRefinement = (
  data: z.infer<typeof scopeFieldsBase>,
  ctx: z.RefinementCtx,
) => {
  if (
    data.scope === 'jurisdiction' &&
    (data.cityTown == null || data.cityTown.trim() === '')
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'cityTown is required when scope is jurisdiction',
      path: ['cityTown'],
    });
  }
};

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

const committeeRosterReportSchema = z.object({
  type: z.literal('committeeRoster'),
  ...baseApiSchema.shape,
  name: z.string(),
  format: z.enum(['pdf', 'xlsx']),
  ...scopeFieldsBase.shape,
  includeFields: z.array(z.string()).optional().default([]),
  xlsxConfig: xlsxConfigSchema,
});

const signInSheetReportSchema = z.object({
  type: z.literal('signInSheet'),
  ...baseApiSchema.shape,
  name: z.string(),
  format: z.literal('pdf'),
  ...scopeFieldsBase.shape,
  meetingDate: z.string().optional(),
});

const designationWeightSummaryReportSchema = z.object({
  type: z.literal('designationWeightSummary'),
  ...baseApiSchema.shape,
  name: z.string(),
  format: z.enum(['pdf', 'xlsx']),
  ...scopeFieldsBase.shape,
});

const vacancyReportSchema = z.object({
  type: z.literal('vacancyReport'),
  ...baseApiSchema.shape,
  name: z.string(),
  format: z.enum(['pdf', 'xlsx']),
  ...scopeFieldsBase.shape,
  vacancyFilter: z.enum(['all', 'vacantOnly']).default('vacantOnly'),
});

const changesReportSchema = z.object({
  type: z.literal('changesReport'),
  ...baseApiSchema.shape,
  name: z.string(),
  format: z.enum(['pdf', 'xlsx']),
  ...scopeFieldsBase.shape,
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected ISO date YYYY-MM-DD'),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected ISO date YYYY-MM-DD'),
});

const petitionOutcomesReportSchema = z.object({
  type: z.literal('petitionOutcomesReport'),
  ...baseApiSchema.shape,
  name: z.string(),
  format: z.enum(['pdf', 'xlsx']),
  ...scopeFieldsBase.shape,
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
const generateReportVariants = [
  designatedPetitionReportSchema,
  ldCommitteesReportSchema,
  committeeRosterReportSchema,
  voterListReportSchema,
  absenteeReportSchema,
  voterImportReportSchema,
  signInSheetReportSchema,
  designationWeightSummaryReportSchema,
  vacancyReportSchema,
  changesReportSchema,
  petitionOutcomesReportSchema,
] as const;

export const generateReportSchema = z
  .discriminatedUnion('type', generateReportVariants)
  .superRefine((data, ctx) => {
    if ('scope' in data) {
      scopeFieldsRefinement(
        {
          scope: data.scope,
          cityTown: 'cityTown' in data ? data.cityTown : undefined,
        },
        ctx,
      );
    }
  });

// Additional fields for enriched report data
const enrichedFieldsSchema = z.object({
  reportAuthor: z.string().min(1, 'Report author is required'),
  jobId: z.string().cuid('Job ID must be a valid CUID'),
});

const enrichVariant = <
  T extends z.ZodObject<z.ZodRawShape & { type: z.ZodTypeAny }>,
>(
  schema: T,
) => schema.merge(enrichedFieldsSchema);

type EnrichedDiscriminatedOptions = [
  z.ZodDiscriminatedUnionOption<'type'>,
  ...z.ZodDiscriminatedUnionOption<'type'>[],
];

// Enriched report data that extends the generate report schema with additional fields
export const enrichedReportDataSchema = z
  .discriminatedUnion('type', [
    ...generateReportVariants.map(enrichVariant),
    enrichVariant(boeEligibilityFlaggingReportSchema),
  ] as unknown as EnrichedDiscriminatedOptions)
  .superRefine((data, ctx) => {
    if ('scope' in data) {
      scopeFieldsRefinement(
        {
          scope: data.scope,
          cityTown: 'cityTown' in data ? data.cityTown : undefined,
        },
        ctx,
      );
    }
  });

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

import {
  SCOPE_REPORT_TYPES,
  type ScopeReportType,
} from '../scopeReportRegistry';

export { SCOPE_REPORT_TYPES, type ScopeReportType };

// Extract the union variants that correspond to scope-based report types
export type ScopedReportData = Extract<
  GenerateReportData,
  { type: ScopeReportType }
>;

// Compile-time exhaustiveness check: ensure every GenerateReportData variant
// with a `scope` field is listed in SCOPE_REPORT_TYPES.
// If a new scope-based schema is added to generateReportSchema but not to
// SCOPE_REPORT_TYPES, this line will produce a TS error.
type _ScopeExhaustive = Exclude<
  Extract<GenerateReportData, { scope: string }>['type'],
  ScopeReportType
> extends never
  ? true
  : { error: 'A scope-based report type is missing from SCOPE_REPORT_TYPES' };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assertExhaustive: _ScopeExhaustive = true;

/** Type guard that narrows GenerateReportData to the scope-based variants. */
export function isScopedReportData(
  data: GenerateReportData,
): data is ScopedReportData {
  return (SCOPE_REPORT_TYPES as readonly string[]).includes(data.type);
}
