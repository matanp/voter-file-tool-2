import type { SearchQueryField } from "@voter-file-tool/shared-validators";
import {
  isNumberFieldName,
  isDateFieldName,
  isStringFieldName,
  isComputedBooleanFieldName,
} from "@voter-file-tool/shared-validators";
import { normalizeSearchQuery } from "@voter-file-tool/shared-validators";
import type { BaseSearchField, SearchField } from "~/types/searchFields";

/**
 * Error class for frontend search query field conversion errors
 */
export class FrontendSearchQueryFieldError extends Error {
  constructor(
    message: string,
    public field?: unknown,
    public cause?: Error,
  ) {
    super(message);
    this.name = "FrontendSearchQueryFieldError";
  }
}

/**
 * Converts a BaseSearchField to SearchQueryField with proper error handling
 * @param field - The frontend search field to convert
 * @returns The converted field or null if conversion should be skipped
 * @throws FrontendSearchQueryFieldError if conversion fails
 */
export function convertBaseSearchFieldToSearchQueryField(
  field: BaseSearchField,
): SearchQueryField | null {
  try {
    // Skip empty or invalid fields
    if (
      field.name === "empty" ||
      field.value === undefined ||
      field.value === null
    ) {
      return null;
    }

    const fieldName = field.name;

    // Handle number fields with proper type narrowing
    if (isNumberFieldName(fieldName)) {
      const numValue =
        typeof field.value === "number" ? field.value : Number(field.value);

      if (isNaN(numValue)) {
        throw new FrontendSearchQueryFieldError(
          `Invalid number value for field ${fieldName}: ${String(field.value)}`,
          field,
        );
      }

      return {
        field: fieldName,
        values: [numValue],
      };
    }

    // Handle boolean fields with proper type narrowing
    if (isComputedBooleanFieldName(fieldName)) {
      // Only emit when true; unchecked maps to undefined earlier and will be skipped
      if (field.value === true) {
        return {
          field: fieldName,
          value: true,
        };
      }
      return null;
    }

    // Handle date fields with proper type narrowing
    if (isDateFieldName(fieldName)) {
      let dateValue: string;

      if (field.value instanceof Date) {
        dateValue = field.value.toISOString();
      } else {
        const dateStr = String(field.value);
        // Validate that it's a valid date string
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          throw new FrontendSearchQueryFieldError(
            `Invalid date value for field ${fieldName}: ${String(field.value)}`,
            field,
          );
        }
        dateValue = dateStr;
      }

      return {
        field: fieldName,
        values: [dateValue],
      };
    }

    // Handle string fields (all other fields) with proper type narrowing
    if (isStringFieldName(fieldName)) {
      return {
        field: fieldName,
        values: [String(field.value)],
      };
    }

    // Exhaustive compile-time check: if we reach here, fieldName is never
    const exhaustiveCheck: never = fieldName;
    throw new FrontendSearchQueryFieldError(
      `Unknown field type: ${String(exhaustiveCheck)}`,
      field,
    );
  } catch (error: unknown) {
    if (error instanceof FrontendSearchQueryFieldError) {
      throw error;
    }
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: string | undefined }).message ?? "")
        : "Unknown error";
    throw new FrontendSearchQueryFieldError(
      `Conversion failed for field ${field.name}: ${message}`,
      field,
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Converts SearchField array to SearchQueryField array with proper error handling
 * @param searchFields - Array of frontend search fields
 * @returns Array of converted fields
 * @throws FrontendSearchQueryFieldError if any conversion fails
 */
export function convertSearchFieldsToSearchQuery(
  searchFields: SearchField[],
): SearchQueryField[] {
  try {
    const result: SearchQueryField[] = [];

    for (const field of searchFields) {
      if (field.compoundType) {
        // Convert compound field sub-fields
        for (const subField of field.fields) {
          const converted = convertBaseSearchFieldToSearchQueryField(subField);
          if (converted) {
            result.push(converted);
          }
        }
      } else {
        // Convert simple field
        const converted = convertBaseSearchFieldToSearchQueryField(field);
        if (converted) {
          result.push(converted);
        }
      }
    }

    // Normalize the final query before returning
    return normalizeSearchQuery(result);
  } catch (error: unknown) {
    if (error instanceof FrontendSearchQueryFieldError) {
      throw error;
    }
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: string | undefined }).message ?? "")
        : "Unknown error";
    throw new FrontendSearchQueryFieldError(
      `Failed to convert search fields: ${message}`,
      searchFields,
      error instanceof Error ? error : undefined,
    );
  }
}

/**
 * Safe conversion function that returns a result object instead of throwing
 * @param field - The frontend search field to convert
 * @returns Result object with success/error information
 */
export function safeConvertBaseSearchFieldToSearchQueryField(
  field: BaseSearchField,
):
  | { success: true; data: SearchQueryField }
  | { success: false; error: string } {
  try {
    const result = convertBaseSearchFieldToSearchQueryField(field);
    if (!result) {
      return { success: false, error: "Field conversion returned null" };
    }
    return { success: true, data: result };
  } catch (error: unknown) {
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: string | undefined }).message ?? "")
        : "Unknown conversion error";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Safe conversion function for arrays that returns a result object
 * @param searchFields - Array of frontend search fields
 * @returns Result object with success/error information
 */
export function safeConvertSearchFieldsToSearchQuery(
  searchFields: SearchField[],
):
  | { success: true; data: SearchQueryField[] }
  | { success: false; error: string } {
  try {
    const result = convertSearchFieldsToSearchQuery(searchFields);
    return { success: true, data: result };
  } catch (error: unknown) {
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: string | undefined }).message ?? "")
        : "Unknown conversion error";
    return {
      success: false,
      error: message,
    };
  }
}
