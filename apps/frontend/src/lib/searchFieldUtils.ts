import type { SearchField, BaseSearchField } from "~/types/searchFields";
import type { FieldName } from "~/app/recordsearch/fieldsConfig";
import { fields } from "~/app/recordsearch/fieldsConfig";

// Map additional criteria flags to fields to add to output display
const ADDITIONAL_CRITERIA_TRUE_TO_FIELD: Readonly<
  Partial<Record<BaseSearchField["name"], FieldName>>
> = {
  hasEmail: "email",
  hasInvalidEmail: "email",
  hasPhone: "telephone",
} as const;

/**
 * Extracts field names from a search query, including nested compound fields
 * @param searchQuery - Array of SearchField objects
 * @returns Array of field names that should be displayed in the table
 */
export function extractFieldNamesFromSearchQuery(
  searchQuery: SearchField[],
): FieldName[] {
  const fieldNames = new Set<FieldName>();

  searchQuery.forEach((field) => {
    if (field.compoundType && field.fields) {
      // For compound fields, add all sub-fields
      field.fields.forEach((subField) => {
        if (
          subField.name &&
          subField.name !== "empty" &&
          isValidFieldName(subField.name)
        ) {
          fieldNames.add(subField.name);
        }
        if (field.name === "additionalCriteria" && subField.value === true) {
          const mappedFieldName =
            ADDITIONAL_CRITERIA_TRUE_TO_FIELD[subField.name];
          if (mappedFieldName) {
            fieldNames.add(mappedFieldName);
          }
        }
      });
    } else if (
      field.name &&
      field.name !== "empty" &&
      isValidFieldName(field.name)
    ) {
      fieldNames.add(field.name);
    }
  });

  return Array.from(fieldNames);
}

/**
 * Checks if a field name is valid for display in the table
 * @param fieldName - The field name to check
 * @returns True if the field name is valid
 */
function isValidFieldName(fieldName: string): fieldName is FieldName {
  return fields.some((field) => field.name === fieldName);
}

/**
 * Gets the default fields to display when no search is performed
 * @returns Array of default field names
 */
export function getDefaultFieldsList(): FieldName[] {
  return ["DOB", "telephone"];
}

/**
 * Creates a smart field list that combines search fields with default fields
 * If the fieldsList is shorter than the default list, it fills the remaining slots
 * with fields from the default list to maintain a consistent table width
 * @param fieldsList - Array of field names from search query
 * @returns Array of field names for display, combining search and default fields
 */
export function createSmartFieldsList(fieldsList: FieldName[]): FieldName[] {
  const defaultFields = getDefaultFieldsList();

  if (fieldsList.length === 0) {
    return defaultFields;
  }

  // If search fields are fewer than default fields, combine them
  if (fieldsList.length < defaultFields.length) {
    const combinedFields = [...fieldsList];

    for (const defaultField of defaultFields) {
      if (
        !combinedFields.includes(defaultField) &&
        combinedFields.length < defaultFields.length
      ) {
        combinedFields.push(defaultField);
      }
    }

    return combinedFields;
  }

  return fieldsList;
}
