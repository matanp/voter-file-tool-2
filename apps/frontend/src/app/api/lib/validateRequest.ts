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
  try {
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    console.log("Validation error:", error);
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Invalid request data",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 400 },
      ),
    };
  }
}
