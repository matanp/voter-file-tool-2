import { z } from 'zod';
import { generateDesignatedPetitionDataSchema } from './designatedPetition';
import { ldCommitteesArraySchema } from './ldCommittees';

// Base API schema for common fields
export const baseApiSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

// Additional fields for enriched report data
const enrichedFieldsSchema = z.object({
  reportAuthor: z.string().min(1, 'Report author is required'),
  jobId: z.string().cuid('Job ID must be a valid CUID'),
});

// Base schemas for each report type
const designatedPetitionBaseSchema = z.object({
  type: z.literal('designatedPetition'),
  ...baseApiSchema.shape,
  payload: generateDesignatedPetitionDataSchema,
});

const ldCommitteesBaseSchema = z.object({
  type: z.literal('ldCommittees'),
  ...baseApiSchema.shape,
  format: z.enum(['pdf', 'xlsx']).optional().default('pdf'),
  payload: ldCommitteesArraySchema,
});

// Generate Report Schema - discriminated union for different report types
export const generateReportSchema = z.discriminatedUnion('type', [
  designatedPetitionBaseSchema,
  ldCommitteesBaseSchema,
]);

// Enriched report data that extends the generate report schema with additional fields
export const enrichedReportDataSchema = z.discriminatedUnion('type', [
  designatedPetitionBaseSchema.extend(enrichedFieldsSchema.shape),
  ldCommitteesBaseSchema.extend(enrichedFieldsSchema.shape),
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
