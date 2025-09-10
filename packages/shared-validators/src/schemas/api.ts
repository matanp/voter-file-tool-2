import { z } from 'zod';

// Common API schemas
export const uuidSchema = z.string().uuid('Must be a valid UUID');
export const nonEmptyStringSchema = z.string().min(1, 'String cannot be empty');

// HTTP status codes
export const httpStatusSchema = z.number().int().min(100).max(599);

// API request/response base schemas
export const apiRequestSchema = z.object({
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
});

export const apiResponseSchema = z.object({
  status: httpStatusSchema,
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
});

// Webhook signature validation
export const webhookSignatureSchema = z.object({
  signature: z.string().min(1, 'Webhook signature is required'),
  payload: z.string().min(1, 'Webhook payload is required'),
  secret: z.string().min(1, 'Webhook secret is required'),
});

// Environment variables validation
export const environmentSchema = z.object({
  WEBHOOK_SECRET: z.string().min(1, 'WEBHOOK_SECRET is required'),
  CALLBACK_URL: z.string().url('CALLBACK_URL must be a valid URL'),
  PDF_SERVER_URL: z
    .string()
    .url('PDF_SERVER_URL must be a valid URL')
    .optional(),
  ABLY_API_KEY: z.string().min(1, 'ABLY_API_KEY is required').optional(),
});

// Callback URL validation
export const callbackUrlSchema = z
  .string()
  .url('Callback URL must be a valid URL');

// Type exports
export type UUID = z.infer<typeof uuidSchema>;
export type NonEmptyString = z.infer<typeof nonEmptyStringSchema>;
export type HttpStatus = z.infer<typeof httpStatusSchema>;
export type ApiRequest = z.infer<typeof apiRequestSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;
export type WebhookSignature = z.infer<typeof webhookSignatureSchema>;
export type Environment = z.infer<typeof environmentSchema>;
export type CallbackUrl = z.infer<typeof callbackUrlSchema>;
