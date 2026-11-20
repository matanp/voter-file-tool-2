import { z } from 'zod';

/**
 * A request-validation 422's per-field messages: top-level body field →
 * messages. Forms show each message beside its field.
 */
export const fieldErrorsSchema = z.record(z.string().array());
export type FieldErrors = z.infer<typeof fieldErrorsSchema>;

/** The 422 body `validateRequest` sends when a request fails its schema. */
export const validationErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
    fieldErrors: fieldErrorsSchema.optional(),
  })
  .strict();
export type ValidationErrorResponse = z.infer<
  typeof validationErrorResponseSchema
>;

/** A Zod error's top-level field → messages, leaving out fields with none. */
export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const [field, messages] of Object.entries(
    error.flatten().fieldErrors,
  )) {
    if (messages && messages.length > 0) result[field] = messages;
  }
  return result;
}

/** The first message for each field that has one. */
export function firstFieldMessages<F extends string>(
  fieldErrors: Partial<Record<F, string[]>>,
): Partial<Record<F, string>> {
  const result: Partial<Record<F, string>> = {};
  for (const field in fieldErrors) {
    const first = fieldErrors[field]?.[0];
    if (first) result[field] = first;
  }
  return result;
}
