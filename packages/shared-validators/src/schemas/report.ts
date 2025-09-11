import { z } from 'zod';
import { generateDesignatedPetitionDataSchema } from './designatedPetition';
import {
  ldCommitteesArraySchema,
  createLDCommitteesArraySchema,
  type VoterRecordField,
} from './ldCommittees';

// Base API schema for common fields
export const baseApiSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

// Individual report type schemas
const designatedPetitionReportSchema = z.object({
  type: z.literal('designatedPetition'),
  ...baseApiSchema.shape,
  payload: generateDesignatedPetitionDataSchema,
});

const ldCommitteesReportSchema = z.object({
  type: z.literal('ldCommittees'),
  ...baseApiSchema.shape,
  format: z.enum(['pdf', 'xlsx']).optional().default('pdf'),
  payload: ldCommitteesArraySchema,
  // Optional field to specify which VoterRecord fields to include
  includeFields: z.array(z.string()).optional().default([]),
  // XLSX-specific configuration (only applies when format is 'xlsx')
  xlsxConfig: z
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
    .optional(),
});

// Generate Report Schema - discriminated union for different report types
export const generateReportSchema = z.discriminatedUnion('type', [
  designatedPetitionReportSchema,
  ldCommitteesReportSchema,
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
]);

// Report complete webhook payload schema
export const reportCompleteWebhookPayloadSchema = z.object({
  success: z.boolean(),
  jobId: z.string().cuid('Job ID must be a valid CUID'),
  type: z.string().optional(),
  url: z.string().optional(),
  error: z.string().optional(),
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

// Helper function to create a dynamic LD committees report schema
export const createLDCommitteesReportSchema = (
  selectedFields: VoterRecordField[] = []
) => {
  const dynamicPayloadSchema = createLDCommitteesArraySchema(selectedFields);

  return z.object({
    type: z.literal('ldCommittees'),
    ...baseApiSchema.shape,
    format: z.enum(['pdf', 'xlsx']).optional().default('pdf'),
    payload: dynamicPayloadSchema,
    includeFields: z.array(z.string()).optional().default(selectedFields),
  });
};

// Helper function to create a dynamic generate report schema
export const createGenerateReportSchema = (
  ldCommitteesFields: VoterRecordField[] = []
) => {
  const dynamicLDCommitteesSchema =
    createLDCommitteesReportSchema(ldCommitteesFields);

  return z.discriminatedUnion('type', [
    designatedPetitionReportSchema,
    dynamicLDCommitteesSchema,
  ]);
};

// Type exports
export type GenerateReportData = z.infer<typeof generateReportSchema>;
export type EnrichedReportData = z.infer<typeof enrichedReportDataSchema>;
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

// Dynamic schema types
export type DynamicGenerateReportData = z.infer<
  ReturnType<typeof createGenerateReportSchema>
>;
export type DynamicLDCommitteesReportData = z.infer<
  ReturnType<typeof createLDCommitteesReportSchema>
>;
