import type { SearchQueryField } from './schemas/report';
import {
  isComputedBooleanSearchField,
  isDateValuesSearchField,
  isDateRangeSearchField,
  isNumberSearchField,
  isStringSearchField,
  isNameFieldName,
} from './searchQueryFieldGuards';

/**
 * Normalizes a single SearchQueryField value set.
 * - Trims string values
 * - Uppercases names (firstName, lastName)
 * - Drops empty strings and nulls from values arrays
 * - Drops computed boolean fields unless value is true
 * Returns null if the field becomes empty after normalization.
 */
export function normalizeSearchQueryField(
  field: SearchQueryField
): SearchQueryField | null {
  // Handle computed boolean fields
  if (isComputedBooleanSearchField(field)) {
    return field.value === true ? field : null;
  }

  // Handle number fields
  if (isNumberSearchField(field)) {
    const filtered = field.values.filter((v): v is number => v !== null);
    if (filtered.length === 0) return null;
    return { field: field.field, values: filtered };
  }

  // Handle string fields
  if (isStringSearchField(field)) {
    const isName = isNameFieldName(field.field);
    const normalized = field.values
      .map((v) => (typeof v === 'string' ? v.trim() : v))
      .filter(
        (v): v is string => typeof v === 'string' && v !== null && v !== ''
      )
      .map((v) => (isName ? v.toUpperCase() : v));
    if (normalized.length === 0) return null;
    return { field: field.field, values: normalized };
  }

  // Handle date fields with values array
  if (isDateValuesSearchField(field)) {
    const normalized = field.values
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .map((v) => v.trim());
    if (normalized.length === 0) return null;
    return { field: field.field, values: normalized };
  }

  // Handle date range fields
  if (isDateRangeSearchField(field)) {
    const range = field.range;
    if (!range) return null;

    // Check if range has at least one valid date
    const hasValidStartDate = range.startDate && range.startDate.trim() !== '';
    const hasValidEndDate = range.endDate && range.endDate.trim() !== '';

    if (!hasValidStartDate && !hasValidEndDate) return null;

    return field;
  }

  // Exhaustive safety: unknown field kinds are dropped
  return null;
}

/**
 * Normalizes an array of SearchQueryField entries using normalizeSearchQueryField.
 * Filters out any fields that become empty after normalization.
 */
export function normalizeSearchQuery(
  searchQuery: SearchQueryField[]
): SearchQueryField[] {
  const result: SearchQueryField[] = [];
  for (const f of searchQuery) {
    const normalized = normalizeSearchQueryField(f);
    if (normalized) result.push(normalized);
  }
  return result;
}
