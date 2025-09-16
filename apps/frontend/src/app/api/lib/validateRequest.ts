import { NextResponse } from "next/server";
import { type z } from "zod";

/**
 * Validates request body against a Zod schema and returns parsed data or error response
 * @param body - The request body to validate
 * @param schema - The Zod schema to validate against
 * @returns Object with success flag and either parsed data or error response
 */
export function validateRequest<T>(
  body: unknown,
  schema: z.ZodSchema<T>,
): { success: true; data: T } | { success: false; response: NextResponse } {
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

  return {
    success: false,
    response: NextResponse.json(
      { success: false, error: "Invalid request data" },
      { status: 422 },
    ),
  };
}
