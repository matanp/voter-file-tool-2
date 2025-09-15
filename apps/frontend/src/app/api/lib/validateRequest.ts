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
  } else {
    console.debug("Request validation failed");
  }

  const fieldErrors = result.error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

  return {
    success: false,
    response: NextResponse.json(
      {
        error: "Invalid request data",
        details: fieldErrors,
      },
      { status: 400 },
    ),
  };
}
