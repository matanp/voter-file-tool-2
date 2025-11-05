import { z } from "zod";

// Generic API response schema
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// Generic API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: string;
}

// Generic API response validator
export function validateApiResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
): ApiResponse<T> | ApiErrorResponse {
  try {
    // First validate the basic response structure
    const responseResult = apiResponseSchema.safeParse(data);
    if (!responseResult.success) {
      return {
        success: false,
        error: "Invalid response format",
        details: responseResult.error.message,
      };
    }

    const { success, data: responseData, error, message } = responseResult.data;

    if (!success) {
      return {
        success: false,
        error: error ?? "Unknown error",
        details: message,
      };
    }

    // If we have data, validate it with the provided schema
    if (responseData !== undefined) {
      const dataResult = schema.safeParse(responseData);
      if (!dataResult.success) {
        console.error("Schema validation failed:", dataResult.error.issues);
        console.error("Data that failed validation:", responseData);
        console.error("Data type:", typeof responseData);
        console.error("Is array:", Array.isArray(responseData));
        if (Array.isArray(responseData)) {
          console.error("Array length:", responseData.length);
          console.error("First item:", responseData[0]);
        }
        return {
          success: false,
          error: "Invalid data format",
          details: dataResult.error.message,
        };
      }

      return {
        success: true,
        data: dataResult.data,
        message,
      };
    }

    return {
      success: true,
      message,
    };
  } catch (error) {
    return {
      success: false,
      error: "Validation failed",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Safe API response parser
export function safeParseApiResponse<T>(
  response: Response,
  schema: z.ZodSchema<T>,
): Promise<ApiResponse<T> | ApiErrorResponse> {
  return response.json().then(
    (data) => validateApiResponse(data, schema),
    (error) => ({
      success: false,
      error: "Failed to parse response",
      details: error instanceof Error ? error.message : "Unknown error",
    }),
  );
}

// Type-safe fetch wrapper
export async function typeSafeFetch<T>(
  url: string,
  options: RequestInit,
  schema: z.ZodSchema<T>,
): Promise<ApiResponse<T> | ApiErrorResponse> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return await safeParseApiResponse(response, schema);
  } catch (error) {
    return {
      success: false,
      error: "Network error",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
