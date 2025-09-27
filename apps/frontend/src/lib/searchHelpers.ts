import type {
  SearchField,
  SearchFieldValue,
  BaseFieldType,
  BaseSearchField,
} from "~/types/searchFields";
import type { DropdownLists } from "@prisma/client";

// Constants
export const EMPTY_FIELD: SearchField = {
  name: "empty",
  displayName: "Select a field",
  value: "",
  compoundType: false,
  type: "String",
};

export const FIELD_TYPES = {
  STRING: "String",
  NUMBER: "number",
  DROPDOWN: "Dropdown",
  DATETIME: "DateTime",
  STREET: "Street",
  CITY_TOWN: "CityTown",
  BOOLEAN: "Boolean",
  HIDDEN: "Hidden",
} as const;

export const FIELD_NAMES = {
  EMPTY: "empty",
  CITY: "city",
} as const;

export const DISPLAY_LABEL_THRESHOLDS = {
  SHORT_LABEL: 10,
  MEDIUM_LABEL: 15,
} as const;

export const generateId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `search-row-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

export const addIdsIfMissing = (
  field: SearchField,
  existingId?: string,
): SearchField => {
  const id = existingId ?? field.id ?? generateId();

  if (field.compoundType) {
    return {
      ...field,
      id,
      fields: field.fields.map((subField) => ({
        ...subField,
        id: subField.id ?? generateId(),
      })),
    };
  }

  return { ...field, id };
};

export const isMeaningful = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value === true;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return value !== 0 && !isNaN(value);
  if (Array.isArray(value)) return value.length > 0;
  return true; // For other types like Date
};

export const filterMeaningfulRows = (
  searchRows: SearchField[],
): SearchField[] => {
  return searchRows
    .map((row) =>
      row.compoundType
        ? {
            ...row,
            fields: row.fields.filter((f) => isMeaningful(f.value)),
          }
        : row,
    )
    .filter((row) =>
      row.compoundType ? row.fields.length > 0 : isMeaningful(row.value),
    );
};

export const getAvailableFields = (
  searchRows: SearchField[],
  allFields: SearchField[],
  currentRowName: string,
) => {
  return allFields
    .filter(
      (field) =>
        ((field.compoundType || field.type !== "Hidden") &&
          searchRows.find((row) => row.name === field.name) === undefined) ||
        field.name === currentRowName,
    )
    .map((field) => ({
      label: field.displayName,
      value: field.name,
    }));
};

export const canRemoveRow = (
  searchRows: SearchField[],
  _index: number,
): boolean => {
  return searchRows.length > 1 || searchRows[0]?.name !== "empty";
};

export const getDropdownItems = (
  fieldName: string,
  dropdownList: DropdownLists,
): Array<{ label: string; value: string }> => {
  const items = dropdownList[fieldName as keyof DropdownLists];
  if (!items || !Array.isArray(items)) return [];

  return items.map((item: string) => ({
    label: item,
    value: item,
  }));
};

export const getDropdownDisplayLabel = (
  displayName: string,
  allowMultiple: boolean,
): string => {
  if (allowMultiple) {
    return displayName.length < DISPLAY_LABEL_THRESHOLDS.SHORT_LABEL
      ? `Select ${displayName}`
      : displayName;
  }
  return `Select ${displayName}`;
};

/**
 * Type-safe field value processing with proper type narrowing
 * @param value - The raw value to process
 * @param type - The field type to determine processing logic
 * @returns The processed value ready for storage/display
 */
export function processFieldValue(
  value: SearchFieldValue,
  type: BaseFieldType,
): SearchFieldValue {
  try {
    if (type === "number") {
      // Convert empty strings to undefined, numbers to numbers
      return value === "" ? undefined : Number(value);
    }
    if (type === "Boolean") {
      // Ensure boolean values are properly handled
      return value ?? undefined;
    }
    // For all other types (String, DateTime, Dropdown, Street, CityTown, Hidden)
    // return as-is to maintain data integrity
    return value;
  } catch {
    // If any processing fails, return the original value
    return value;
  }
}

/**
 * Type-safe field value assignment helper
 * Processes and assigns field values with proper type safety
 */
export function assignProcessedFieldValue<T extends BaseSearchField>(
  field: T,
  value: SearchFieldValue,
): T {
  const processedValue = processFieldValue(value, field.type);
  return {
    ...field,
    value: processedValue,
  } as T;
}
