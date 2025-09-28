import type {
  SearchField,
  SearchFieldValue,
  BaseSearchField,
} from "~/types/searchFields";
import type { DropdownLists } from "@prisma/client";
import { SEARCH_CONFIG, FIELD_CONFIG } from "./searchConfiguration";
import { SearchFieldProcessor } from "./searchFieldProcessor";

// Define EMPTY_FIELD directly here since it's used in multiple places
export const EMPTY_FIELD: SearchField = {
  name: FIELD_CONFIG.emptyFieldName,
  displayName: "Select a field",
  value: "",
  compoundType: false,
  type: "String",
};

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

export const filterMeaningfulRows = (
  searchRows: SearchField[],
): SearchField[] => {
  return searchRows
    .map((row) =>
      row.compoundType
        ? {
            ...row,
            fields: row.fields.filter((f) =>
              SearchFieldProcessor.isValidValue(f.value),
            ),
          }
        : row,
    )
    .filter((row) =>
      row.compoundType
        ? row.fields.length > 0
        : SearchFieldProcessor.isValidValue(row.value),
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
  return (
    searchRows.length > 1 || searchRows[0]?.name !== FIELD_CONFIG.emptyFieldName
  );
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

/**
 * Type-safe field value assignment helper
 * Processes and assigns field values with proper type safety using unified processor
 */
export function assignProcessedFieldValue<T extends BaseSearchField>(
  field: T,
  value: SearchFieldValue,
): T {
  const processedValue = SearchFieldProcessor.normalizeForStorage(value, field);
  return {
    ...field,
    value: processedValue,
  } as T;
}
