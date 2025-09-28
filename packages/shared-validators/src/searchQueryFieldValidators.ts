import { z } from 'zod';
import type { SearchQueryField } from './schemas/report';
import { searchQueryFieldSchema } from './schemas/report';
import { SearchQueryFieldError } from './searchQueryErrors';

/**
 * Validates a single search query field
 * @param field - The field to validate
 * @returns The validated field
 * @throws SearchQueryFieldError if validation fails
 */
export function validateSearchQueryField(field: unknown): SearchQueryField {
  try {
    const result = searchQueryFieldSchema.safeParse(field);
    if (!result.success) {
      throw new SearchQueryFieldError(
        `Invalid search query field: ${result.error.message}`,
        field
      );
    }
    return result.data;
  } catch (error) {
    if (error instanceof SearchQueryFieldError) {
      throw error;
    }
    throw new SearchQueryFieldError(
      `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      field,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Validates an array of search query fields
 * @param query - The query array to validate
 * @returns Object with validation results
 */
export function validateSearchQuery(query: unknown[]): {
  valid: boolean;
  errors: string[];
  data: SearchQueryField[];
} {
  const errors: string[] = [];
  const validFields: SearchQueryField[] = [];

  query.forEach((field, index) => {
    try {
      const validatedField = validateSearchQueryField(field);
      validFields.push(validatedField);
    } catch (error) {
      errors.push(
        `Field ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    data: validFields,
  };
}

/**
 * Safe validation function that returns a result object instead of throwing
 * @param field - The field to validate
 * @returns Result object with success/error information
 */
export function safeValidateSearchQueryField(
  field: unknown
):
  | { success: true; data: SearchQueryField }
  | { success: false; error: string } {
  try {
    const result = validateSearchQueryField(field);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Safe validation function for arrays
 * @param query - The query array to validate
 * @returns Result object with success/error information
 */
export function safeValidateSearchQuery(
  query: unknown[]
):
  | { success: true; data: SearchQueryField[] }
  | { success: false; error: string } {
  const validation = validateSearchQuery(query);

  if (validation.valid) {
    return { success: true, data: validation.data };
  }

  return {
    success: false,
    error: validation.errors.join('; '),
  };
}

/**
 * Filters out empty values from a search query field
 * @param field - The field to filter
 * @returns The filtered field or null if all values are empty
 */
export function filterEmptyValues(
  field: SearchQueryField
): SearchQueryField | null {
  if ('values' in field) {
    const filteredValues = field.values.filter(
      (value) => value !== null && value !== undefined && value !== ''
    );
    if (filteredValues.length === 0) return null;

    // Return the field with filtered values, maintaining the original type
    return {
      ...field,
      values: filteredValues,
    } as SearchQueryField;
  }

  if ('value' in field) {
    if (field.value === null || field.value === undefined) {
      return null;
    }
    return field;
  }

  return field;
}

/**
 * Filters out empty fields from a search query array
 * @param query - The query array to filter
 * @returns Array of non-empty fields
 */
export function filterEmptyFields(
  query: SearchQueryField[]
): SearchQueryField[] {
  return query
    .map(filterEmptyValues)
    .filter((field): field is SearchQueryField => field !== null);
}
