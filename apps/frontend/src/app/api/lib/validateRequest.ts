import { NextResponse } from "next/server";
import { type z } from "zod";
import {
  zodFieldErrors,
  type ValidationErrorResponse,
} from "@voter-file-tool/shared-validators";

/**
 * Validates request body against a Zod schema and returns parsed data or error response.
 * A 422 carries `fieldErrors` (top-level field → messages) when any field failed,
 * so forms can show each message beside its field.
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

  const fieldErrors = zodFieldErrors(result.error);
  const errorBody: ValidationErrorResponse = {
    success: false,
    error: "Invalid request data",
    ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
  };
  return {
    success: false,
    response: NextResponse.json(errorBody, { status: 422 }),
  };
}
