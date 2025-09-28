import type {
  SearchField,
  BaseSearchField,
  CompoundSearchField,
} from "~/types/searchFields";

/**
 * Type guards for SearchField discriminated union.
 */
export function isBaseSearchField(
  field: SearchField,
): field is BaseSearchField {
  return field.compoundType === false;
}

export function isCompoundSearchField(
  field: SearchField,
): field is CompoundSearchField {
  return field.compoundType === true;
}

/**
 * Type guard for validating SearchField updates.
 */
export function isValidSearchFieldUpdate(
  updates: Partial<SearchField>,
): updates is SearchField {
  // Check if compoundType is explicitly set
  if (updates.compoundType !== undefined) {
    if (updates.compoundType === true) {
      // For compound fields, ensure fields array exists
      return (
        typeof updates.name === "string" &&
        typeof updates.displayName === "string" &&
        Array.isArray(updates.fields)
      );
    } else {
      // For base fields, ensure required properties exist
      return (
        typeof updates.name === "string" &&
        typeof updates.displayName === "string" &&
        "type" in updates &&
        typeof updates.type === "string"
      );
    }
  }

  // If compoundType is not set, we can't determine the type safely
  return false;
}

/**
 * Type guard for validating BaseSearchField updates.
 */
export function isValidBaseSearchFieldUpdate(
  updates: Partial<BaseSearchField>,
): updates is BaseSearchField {
  return (
    typeof updates.name === "string" &&
    typeof updates.displayName === "string" &&
    typeof updates.type === "string" &&
    updates.compoundType === false
  );
}

/**
 * Type guard for validating CompoundSearchField updates.
 */
export function isValidCompoundSearchFieldUpdate(
  updates: Partial<CompoundSearchField>,
): updates is CompoundSearchField {
  return (
    typeof updates.name === "string" &&
    typeof updates.displayName === "string" &&
    updates.compoundType === true &&
    Array.isArray(updates.fields)
  );
}

/**
 * Type guard for checking if a field has meaningful data.
 */
export function hasMeaningfulValue(field: BaseSearchField): boolean {
  if (field.value === undefined || field.value === null) {
    return false;
  }

  if (typeof field.value === "boolean") {
    return field.value === true;
  }

  if (typeof field.value === "string") {
    return field.value.trim() !== "";
  }

  if (typeof field.value === "number") {
    return Number.isFinite(field.value);
  }

  if (Array.isArray(field.value)) {
    return field.value.length > 0;
  }

  if (field.value instanceof Date) {
    return Number.isFinite(field.value.getTime());
  }

  return true;
}

/**
 * Type guard for checking if a compound field has meaningful data.
 */
export function hasMeaningfulCompoundValue(
  field: CompoundSearchField,
): boolean {
  return field.fields.some((subField) => hasMeaningfulValue(subField));
}

/**
 * Type guard for checking if any field in a search row has meaningful data.
 */
export function hasMeaningfulSearchValue(field: SearchField): boolean {
  if (isBaseSearchField(field)) {
    return hasMeaningfulValue(field);
  } else {
    return hasMeaningfulCompoundValue(field);
  }
}

/**
 * Type guard for validating field name changes.
 */
export function isValidFieldName(
  name: string,
): name is NonNullable<SearchField["name"]> {
  return typeof name === "string" && name.trim() !== "";
}

/**
 * Type guard for checking if a field is the empty field.
 */
export function isEmptyField(field: SearchField): boolean {
  return field.name === "empty";
}

/**
 * Type guard for checking if a field is a hidden field.
 */
export function isHiddenField(field: BaseSearchField): boolean {
  return field.type === "Hidden";
}

/**
 * Type guard for checking if a field allows multiple values.
 */
export function allowsMultipleValues(field: BaseSearchField): boolean {
  return Boolean(field.allowMultiple);
}
