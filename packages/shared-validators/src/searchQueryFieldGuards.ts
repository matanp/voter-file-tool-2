import type { SearchQueryField } from './schemas/report';
import {
  NUMBER_FIELDS,
  COMPUTED_BOOLEAN_FIELDS,
  DATE_FIELDS,
  STRING_FIELDS,
  searchableFieldEnum,
} from './constants';

/**
 * Type guard to check if a SearchQueryField is a number field
 */
export function isNumberSearchField(
  field: SearchQueryField
): field is Extract<
  SearchQueryField,
  { field: (typeof NUMBER_FIELDS)[number] }
> {
  return (
    'values' in field &&
    NUMBER_FIELDS.includes(field.field as (typeof NUMBER_FIELDS)[number])
  );
}

/**
 * Type guard to check if a SearchQueryField is a computed boolean field
 */
export function isComputedBooleanSearchField(
  field: SearchQueryField
): field is Extract<
  SearchQueryField,
  { field: (typeof COMPUTED_BOOLEAN_FIELDS)[number] }
> {
  return (
    'value' in field &&
    !('values' in field) &&
    COMPUTED_BOOLEAN_FIELDS.includes(
      field.field as (typeof COMPUTED_BOOLEAN_FIELDS)[number]
    )
  );
}

/**
 * Type guard to check if a SearchQueryField is a date field with values array
 */
export function isDateValuesSearchField(
  field: SearchQueryField
): field is Extract<
  SearchQueryField,
  { field: (typeof DATE_FIELDS)[number]; values: (string | null)[] }
> {
  return (
    'values' in field &&
    !('range' in field) &&
    DATE_FIELDS.includes(field.field as (typeof DATE_FIELDS)[number])
  );
}

/**
 * Type guard to check if a SearchQueryField is a date field with range
 */
export function isDateRangeSearchField(
  field: SearchQueryField
): field is Extract<
  SearchQueryField,
  {
    field: (typeof DATE_FIELDS)[number];
    range: { startDate: string | null; endDate: string | null };
  }
> {
  return (
    'range' in field &&
    !('values' in field) &&
    DATE_FIELDS.includes(field.field as (typeof DATE_FIELDS)[number])
  );
}

/**
 * Type guard to check if a SearchQueryField is a string field
 */
export function isStringSearchField(
  field: SearchQueryField
): field is Extract<
  SearchQueryField,
  { field: (typeof STRING_FIELDS)[number] }
> {
  return (
    'values' in field &&
    STRING_FIELDS.includes(field.field as (typeof STRING_FIELDS)[number])
  );
}

/**
 * Type guard to check if a SearchQueryField has values array
 */
export function isValuesSearchField(
  field: SearchQueryField
): field is Extract<SearchQueryField, { values: unknown[] }> {
  return 'values' in field && !('value' in field);
}

/**
 * Type guard to check if a SearchQueryField has a single value
 */
export function isSingleValueSearchField(
  field: SearchQueryField
): field is Extract<SearchQueryField, { value: unknown }> {
  return 'value' in field && !('values' in field);
}

/**
 * Name-based predicates for field subsets, usable without full field objects
 */
export function isNumberFieldName(
  name: string
): name is (typeof NUMBER_FIELDS)[number] {
  return NUMBER_FIELDS.includes(name as (typeof NUMBER_FIELDS)[number]);
}

export function isDateFieldName(
  name: string
): name is (typeof DATE_FIELDS)[number] {
  return DATE_FIELDS.includes(name as (typeof DATE_FIELDS)[number]);
}

/**
 * Type guard to check if a SearchQueryField is any type of date field
 */
export function isDateSearchField(
  field: SearchQueryField
): field is Extract<SearchQueryField, { field: (typeof DATE_FIELDS)[number] }> {
  return (
    ('values' in field || 'range' in field || 'value' in field) &&
    DATE_FIELDS.includes(field.field as (typeof DATE_FIELDS)[number])
  );
}

export function isStringFieldName(
  name: string
): name is (typeof STRING_FIELDS)[number] {
  return STRING_FIELDS.includes(name as (typeof STRING_FIELDS)[number]);
}

export function isComputedBooleanFieldName(
  name: string
): name is (typeof COMPUTED_BOOLEAN_FIELDS)[number] {
  return COMPUTED_BOOLEAN_FIELDS.includes(
    name as (typeof COMPUTED_BOOLEAN_FIELDS)[number]
  );
}

/**
 * Name-based predicate for name fields (firstName, lastName), names are handled differently from other string fields
 */
const NAME_FIELDS = [
  searchableFieldEnum.enum.firstName,
  searchableFieldEnum.enum.lastName,
] as const;

export function isNameFieldName(
  name: string
): name is (typeof NAME_FIELDS)[number] {
  return NAME_FIELDS.includes(name as (typeof NAME_FIELDS)[number]);
}
