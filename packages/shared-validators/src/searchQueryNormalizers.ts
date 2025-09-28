import type { SearchQueryField } from './schemas/report';
import {
  isComputedBooleanSearchField,
  isDateSearchField,
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
  // Computed booleans: only keep when value is true, otherwise drop
  if (isComputedBooleanSearchField(field)) {
    return field.value === true ? field : null;
  }

  // Number fields: remove nulls; if empty => null
  if (isNumberSearchField(field)) {
    const filtered = field.values.filter((v): v is number => v !== null);
    if (filtered.length === 0) return null;
    return { field: field.field, values: filtered };
  }

  // Date fields: trim strings; drop empty strings and nulls
  if (isDateSearchField(field)) {
    const normalized = field.values
      .map((v) => (typeof v === 'string' ? v.trim() : v))
      .filter((v): v is string => v !== null && v !== '');
    if (normalized.length === 0) return null;
    return { field: field.field, values: normalized };
  }

  // String fields: trim; uppercase names; drop empty strings and nulls
  if (isStringSearchField(field)) {
    const isName = isNameFieldName(field.field as string);
    const normalized = field.values
      .map((v) => (typeof v === 'string' ? v.trim() : v))
      .filter(
        (v): v is string => typeof v === 'string' && v !== null && v !== ''
      )
      .map((v) => (isName ? v.toUpperCase() : v));
    if (normalized.length === 0) return null;
    return { field: field.field, values: normalized };
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
