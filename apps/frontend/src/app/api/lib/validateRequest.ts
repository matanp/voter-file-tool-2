import { NextResponse } from "next/server";
import { type z } from "zod";

/**
 * Validates request body against a Zod schema and returns parsed data or error response
 * @param body - The request body to validate
 * @param schema - The Zod schema to validate against
 * @returns Object with success flag and either parsed data or error response
 */
export function validateRequest<Output>(
  body: unknown,
  schema: z.ZodType<Output, z.ZodTypeDef, unknown>,
):
  | { success: true; data: Output }
  | { success: false; response: NextResponse } {
  const result = schema.safeParse(body);

  if (result.success) {
    return { success: true, data: result.data };
  }

  if (process.env.NODE_ENV === "development") {
    console.warn("Validation failed:", result.error.issues);
    const { fieldErrors, formErrors } = result.error.flatten(
      (issue) => `${issue.message} (${issue.code})`,
    );
    console.warn("Field errors:", fieldErrors);
    console.warn("Form errors:", formErrors);
  }

  // Per-field messages let a form put each error beside its field. They are
  // the schema's own messages, so they reveal nothing about stored data.
  const fieldErrors = firstMessagePerField(result.error);

  return {
    success: false,
    response: NextResponse.json(
      {
        success: false,
        error: "Invalid request data",
        ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
      },
      { status: 422 },
    ),
  };
}

function firstMessagePerField(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.flatten().fieldErrors)) {
    const first = messages?.[0];
    if (first) out[field] = first;
  }
  return out;
}
