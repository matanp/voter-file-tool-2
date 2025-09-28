import type {
  SearchFieldValue,
  BaseFieldType,
  BaseSearchField,
  SearchField,
} from "~/types/searchFields";
import type { SearchQueryField } from "@voter-file-tool/shared-validators";
import { VALIDATION_CONFIG, SEARCH_CONFIG } from "./searchConfiguration";
import {
  NUMBER_FIELDS,
  COMPUTED_BOOLEAN_FIELDS,
  DATE_FIELDS,
  STRING_FIELDS,
} from "@voter-file-tool/shared-validators";
import { EARLIEST_DATE, LATEST_DATE } from "~/lib/constants/dateBoundaries";

export class SearchFieldProcessor {
  static normalizeForStorage(
    value: unknown,
    field: BaseSearchField,
  ): SearchFieldValue {
    try {
      return this.validateByType(value, field.type, field.allowMultiple);
    } catch (error) {
      console.warn(`Failed to process value for field ${field.name}:`, error);
      // Return undefined instead of unsafe type assertion
      return undefined;
    }
  }

  /**
   * Converts field values to query format.
   */
  static convertToQueryField(field: BaseSearchField): SearchQueryField | null {
    // Skip empty or invalid fields
    if (
      field.name === "empty" ||
      field.value === undefined ||
      field.value === null
    ) {
      return null;
    }

    const fieldName = field.name;

    // Normalize the value first
    const normalizedValue = this.normalizeForStorage(field.value, field);
    if (normalizedValue === undefined || normalizedValue === null) {
      return null;
    }

    // Handle DateOfBirth fields specially
    if (field.type === "DateOfBirth") {
      return this.convertDateOfBirthToQuery(fieldName, normalizedValue);
    }

    // Handle DateRange fields specially
    if (field.type === "DateRange") {
      // Map the field name to the corresponding database field
      const dbFieldName = this.mapDateRangeFieldToDbField(fieldName);
      return this.convertDateToQuery(
        dbFieldName as (typeof DATE_FIELDS)[number],
        normalizedValue,
      );
    }

    const fieldType = this.getFieldType(fieldName);

    switch (fieldType) {
      case "number":
        return this.convertNumberToQuery(
          fieldName as (typeof NUMBER_FIELDS)[number],
          normalizedValue,
        );
      case "boolean":
        return this.convertBooleanToQuery(
          fieldName as (typeof COMPUTED_BOOLEAN_FIELDS)[number],
          normalizedValue,
        );
      case "date":
        return this.convertDateToQuery(
          fieldName as (typeof DATE_FIELDS)[number],
          normalizedValue,
        );
      case "string":
        return this.convertStringToQuery(
          fieldName as (typeof STRING_FIELDS)[number],
          normalizedValue,
        );
      case "unknown":
        console.warn(`Unknown field type for field ${fieldName}`);
        return null;
      default:
        // Exhaustive check - this should never happen
        const _exhaustiveCheck: never = fieldType;
        console.warn(
          `Unhandled field type for field ${fieldName}:`,
          _exhaustiveCheck,
        );
        return null;
    }
  }

  /**
   * Formats field values for display.
   */
  static formatForDisplay(value: SearchFieldValue): string {
    if (value === undefined || value === null) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number") {
      return String(value);
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    return String(value);
  }

  /**
   * Validates if a processed value is meaningful (not empty/null).
   */
  static isValidValue(value: SearchFieldValue): boolean {
    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value === "boolean") {
      return value === true;
    }

    if (typeof value === "string") {
      return value.trim() !== "";
    }

    if (typeof value === "number") {
      return Number.isFinite(value);
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (value instanceof Date) {
      return Number.isFinite(value.getTime());
    }

    return true;
  }

  /**
   * Gets the appropriate input type for HTML input elements.
   */
  static getInputType(fieldType: BaseFieldType): string {
    switch (fieldType) {
      case "Number":
        return "number";
      case "DateTime":
        return "date";
      case "String":
      case "Dropdown":
      case "Street":
      case "CityTown":
      case "Boolean":
      case "Hidden":
      default:
        return "text";
    }
  }

  /**
   * Gets the appropriate placeholder text for a field.
   */
  static getPlaceholder(
    displayName: string,
    fieldType: BaseFieldType,
    allowMultiple?: boolean,
  ): string {
    const baseText = allowMultiple ? `${displayName}(s)` : displayName;

    switch (fieldType) {
      case "Number":
        return `Enter ${baseText}`;
      case "DateTime":
        return `Select ${baseText}`;
      case "Dropdown":
        return `Select ${baseText}`;
      case "Street":
        return `Enter ${baseText}`;
      case "CityTown":
        return `Select ${baseText}`;
      case "Boolean":
        return displayName;
      case "String":
      default:
        return `Enter ${baseText}`;
    }
  }

  /**
   * Gets the appropriate display label for dropdown fields.
   */
  static getDropdownDisplayLabel(
    displayName: string,
    allowMultiple: boolean,
  ): string {
    if (allowMultiple) {
      return displayName.length < SEARCH_CONFIG.displayThresholds.shortLabel
        ? `Select ${displayName}`
        : displayName;
    }
    return `Select ${displayName}`;
  }

  // Private helper methods

  private static validateByType(
    value: unknown,
    type: BaseFieldType,
    allowMultiple?: boolean,
  ): SearchFieldValue {
    switch (type) {
      case "Number":
        return this.validateNumber(value);
      case "Boolean":
        return this.validateBoolean(value);
      case "String":
        return this.validateString(value, allowMultiple);
      case "DateTime":
        return this.validateDateTime(value);
      case "DateOfBirth":
        return this.validateDateOfBirth(value);
      case "DateRange":
        return this.validateDateRange(value);
      case "Dropdown":
        return this.validateDropdown(value);
      case "Street":
        return this.validateDropdown(value);
      case "CityTown":
        return this.validateCityTown(value);
      case "Hidden":
        return this.validateHidden(value);
      default:
        console.warn(
          `Unknown field type: ${String(type)}, returning undefined`,
        );
        return undefined;
    }
  }

  private static validateNumber(value: unknown): number | undefined {
    if (value === null || value === undefined) {
      return VALIDATION_CONFIG.number.allowEmpty ? undefined : 0;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "") {
        return VALIDATION_CONFIG.number.allowEmpty ? undefined : 0;
      }

      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        return undefined;
      }

      // Apply validation rules
      if (!VALIDATION_CONFIG.number.allowNegative && parsed < 0) {
        return undefined;
      }

      if (!VALIDATION_CONFIG.number.allowDecimal && !Number.isInteger(parsed)) {
        return undefined;
      }

      return parsed;
    }

    return undefined;
  }

  private static validateBoolean(value: unknown): boolean | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === "boolean") {
      return value;
    }

    if (value === "indeterminate") {
      return undefined;
    }

    // Convert truthy/falsy values to boolean
    return Boolean(value);
  }

  private static validateString(
    value: unknown,
    allowMultiple?: boolean,
  ): string | string[] | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === "string") {
      const processed = VALIDATION_CONFIG.string.trimWhitespace
        ? value.trim()
        : value;

      if (processed === "" && !VALIDATION_CONFIG.string.allowEmpty) {
        return undefined;
      }

      // If allowMultiple is true and we have a single string, convert it to array
      if (allowMultiple) {
        return processed === "" ? [] : [processed];
      }

      return processed;
    }

    // Handle array values for multi-string fields
    if (Array.isArray(value)) {
      const processed = value
        .map((item) => {
          if (typeof item === "string") {
            return VALIDATION_CONFIG.string.trimWhitespace ? item.trim() : item;
          }
          return String(item);
        })
        .filter((item) => item !== "" || VALIDATION_CONFIG.string.allowEmpty);

      return processed.length > 0 ? processed : undefined;
    }

    // Convert other types to string
    const stringValue = String(value);
    if (allowMultiple) {
      return stringValue === "" ? [] : [stringValue];
    }
    return stringValue;
  }

  private static validateDateTime(value: unknown): Date | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (value instanceof Date) {
      return Number.isFinite(value.getTime()) ? value : undefined;
    }

    if (typeof value === "string") {
      const date = new Date(value);
      return Number.isFinite(date.getTime()) ? date : undefined;
    }

    if (typeof value === "number") {
      const date = new Date(value);
      return Number.isFinite(date.getTime()) ? date : undefined;
    }

    return undefined;
  }

  private static validateDateRange(
    value: unknown,
  ): { startDate?: Date; endDate?: Date } | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === "object" && value !== null) {
      const range = value as { startDate?: unknown; endDate?: unknown };
      const result: { startDate?: Date; endDate?: Date } = {};

      if (range.startDate !== undefined && range.startDate !== null) {
        const startDate = this.validateDateTime(range.startDate);
        if (startDate) {
          result.startDate = startDate;
        }
      }

      if (range.endDate !== undefined && range.endDate !== null) {
        const endDate = this.validateDateTime(range.endDate);
        if (endDate) {
          result.endDate = endDate;
        }
      }

      // Return the range if at least one date is valid
      if (result.startDate || result.endDate) {
        return result;
      }
    }

    return undefined;
  }

  private static validateDateOfBirth(value: unknown):
    | {
        mode: "single" | "range";
        singleDate?: Date;
        range?: { startDate?: Date; endDate?: Date };
        extendBefore?: boolean;
        extendAfter?: boolean;
      }
    | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === "object" && value !== null) {
      const dobValue = value as {
        mode?: unknown;
        singleDate?: unknown;
        range?: unknown;
        extendBefore?: unknown;
        extendAfter?: unknown;
      };

      // Validate mode
      const validModes = ["single", "range"] as const;
      const mode =
        typeof dobValue.mode === "string" &&
        validModes.includes(dobValue.mode as any)
          ? (dobValue.mode as "single" | "range")
          : "single";

      const result: {
        mode: "single" | "range";
        singleDate?: Date;
        range?: { startDate?: Date; endDate?: Date };
        extendBefore?: boolean;
        extendAfter?: boolean;
      } = {
        mode,
      };

      // Validate singleDate
      if (dobValue.singleDate !== undefined && dobValue.singleDate !== null) {
        const singleDate = this.validateDateTime(dobValue.singleDate);
        if (singleDate) {
          result.singleDate = singleDate;
        }
      }

      // Validate range
      if (dobValue.range !== undefined && dobValue.range !== null) {
        const range = this.validateDateRange(dobValue.range);
        if (range) {
          result.range = range;
        }
      }

      // Validate extendBefore
      if (typeof dobValue.extendBefore === "boolean") {
        result.extendBefore = dobValue.extendBefore;
      }

      // Validate extendAfter
      if (typeof dobValue.extendAfter === "boolean") {
        result.extendAfter = dobValue.extendAfter;
      }

      return result;
    }

    return undefined;
  }

  private static validateDropdown(
    value: unknown,
  ): string | string[] | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (Array.isArray(value)) {
      const processed = value
        .map((item) => this.validateString(item, false))
        .filter((item): item is string => item !== undefined);

      return processed.length > 0 ? processed : undefined;
    }

    return this.validateString(value);
  }

  private static validateCityTown(value: unknown): string | undefined {
    const result = this.validateString(value, false);
    return Array.isArray(result) ? result[0] : result;
  }

  private static validateHidden(value: unknown): SearchFieldValue {
    // Hidden fields can contain any value type, but we should still validate
    if (value === null || value === undefined) {
      return undefined;
    }

    // For hidden fields, we'll convert to string as a safe fallback
    // This is safer than the previous `value as SearchFieldValue`
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "boolean") {
      return value;
    }

    if (Array.isArray(value)) {
      return value as string[];
    }

    if (value instanceof Date) {
      return value;
    }

    // Convert unknown types to string as a safe fallback
    return String(value);
  }

  // Type guard methods for field names

  /**
   * Determines the field type based on the field name.
   * Returns a union type for exhaustive switch checking.
   */
  private static mapDateRangeFieldToDbField(fieldName: string): string {
    // Map date range field names to their corresponding database field names
    const fieldMapping: Record<string, string> = {
      DOBRange: "DOB",
      lastUpdateRange: "lastUpdate",
      originalRegDateRange: "originalRegDate",
    };

    return fieldMapping[fieldName] ?? fieldName;
  }

  private static getFieldType(
    fieldName: string,
  ): "number" | "boolean" | "date" | "string" | "unknown" {
    if (this.isNumberField(fieldName)) {
      return "number";
    }
    if (this.isBooleanField(fieldName)) {
      return "boolean";
    }
    if (this.isDateField(fieldName)) {
      return "date";
    }
    if (this.isStringField(fieldName)) {
      return "string";
    }
    return "unknown";
  }

  private static isNumberField(
    fieldName: string,
  ): fieldName is (typeof NUMBER_FIELDS)[number] {
    return (NUMBER_FIELDS as readonly string[]).includes(fieldName);
  }

  private static isBooleanField(
    fieldName: string,
  ): fieldName is (typeof COMPUTED_BOOLEAN_FIELDS)[number] {
    return (COMPUTED_BOOLEAN_FIELDS as readonly string[]).includes(fieldName);
  }

  private static isDateField(
    fieldName: string,
  ): fieldName is (typeof DATE_FIELDS)[number] {
    return (DATE_FIELDS as readonly string[]).includes(fieldName);
  }

  private static isStringField(
    fieldName: string,
  ): fieldName is (typeof STRING_FIELDS)[number] {
    return (STRING_FIELDS as readonly string[]).includes(fieldName);
  }

  // Query processing methods

  private static convertNumberToQuery(
    fieldName: (typeof NUMBER_FIELDS)[number],
    value: SearchFieldValue,
  ): SearchQueryField | null {
    // If already a number, preserve existing behavior
    if (typeof value === "number") {
      return {
        field: fieldName,
        values: [value],
      };
    }

    // Coerce to string and trim
    const trimmedValue = String(value).trim();

    // If trimmed string is empty, skip the filter
    if (trimmedValue === "") {
      return null;
    }

    // Convert to Number and validate
    const numValue = Number(trimmedValue);

    if (!Number.isFinite(numValue)) {
      throw new Error(
        `Invalid number value for field ${fieldName}: ${String(value)}`,
      );
    }

    return {
      field: fieldName,
      values: [numValue],
    };
  }

  private static convertBooleanToQuery(
    fieldName: (typeof COMPUTED_BOOLEAN_FIELDS)[number],
    value: SearchFieldValue,
  ): SearchQueryField | null {
    // Only emit when true; unchecked maps to undefined earlier and will be skipped
    if (value === true) {
      return {
        field: fieldName,
        value: true,
      };
    }
    return null;
  }

  private static convertDateToQuery(
    fieldName: (typeof DATE_FIELDS)[number],
    value: SearchFieldValue,
  ): SearchQueryField | null {
    // Handle DateRange objects
    if (
      typeof value === "object" &&
      value !== null &&
      ("startDate" in value || "endDate" in value)
    ) {
      const range = value as { startDate?: Date; endDate?: Date };
      const rangeData: { startDate: string | null; endDate: string | null } = {
        startDate: null,
        endDate: null,
      };

      if (range.startDate) {
        rangeData.startDate = range.startDate.toISOString();
      }

      if (range.endDate) {
        rangeData.endDate = range.endDate.toISOString();
      }

      // Only return if at least one date is provided
      if (rangeData.startDate || rangeData.endDate) {
        return {
          field: fieldName,
          range: rangeData,
        } as unknown as SearchQueryField;
      }

      return null;
    }

    // Handle single Date values (existing logic)
    if (value instanceof Date) {
      return {
        field: fieldName,
        values: [value.toISOString()],
      };
    }

    if (typeof value === "string" && value.trim() !== "") {
      // Validate the date string
      const date = new Date(value);
      if (Number.isFinite(date.getTime())) {
        return {
          field: fieldName,
          values: [value],
        };
      }
    }

    return null;
  }

  private static convertDateOfBirthToQuery(
    fieldName: string,
    value: SearchFieldValue,
  ): SearchQueryField | null {
    if (typeof value === "object" && value !== null && "mode" in value) {
      const dobValue = value as {
        mode: "single" | "range";
        singleDate?: Date;
        range?: { startDate?: Date; endDate?: Date };
        extendBefore?: boolean;
        extendAfter?: boolean;
      };

      // Map DOB field name to the corresponding database field
      const dbFieldName = "DOB" as (typeof DATE_FIELDS)[number];

      switch (dobValue.mode) {
        case "single":
          if (dobValue.singleDate) {
            // If extendBefore or extendAfter is enabled, convert to range
            if (dobValue.extendBefore || dobValue.extendAfter) {
              const rangeData: {
                startDate: string | null;
                endDate: string | null;
              } = {
                startDate: dobValue.extendBefore
                  ? EARLIEST_DATE.toISOString()
                  : dobValue.singleDate.toISOString(),
                endDate: dobValue.extendAfter
                  ? LATEST_DATE.toISOString()
                  : dobValue.singleDate.toISOString(),
              };

              return {
                field: dbFieldName,
                range: rangeData,
              } as unknown as SearchQueryField;
            } else {
              // Regular single date
              return {
                field: dbFieldName,
                values: [dobValue.singleDate.toISOString()],
              };
            }
          }
          break;

        case "range":
          // If extension is enabled, use singleDate for the range
          if (dobValue.extendBefore || dobValue.extendAfter) {
            if (dobValue.singleDate) {
              const rangeData: {
                startDate: string | null;
                endDate: string | null;
              } = {
                startDate: dobValue.extendBefore
                  ? EARLIEST_DATE.toISOString()
                  : dobValue.singleDate.toISOString(),
                endDate: dobValue.extendAfter
                  ? LATEST_DATE.toISOString()
                  : dobValue.singleDate.toISOString(),
              };

              return {
                field: dbFieldName,
                range: rangeData,
              } as unknown as SearchQueryField;
            }
          } else if (dobValue.range) {
            // Regular range mode
            const rangeData: {
              startDate: string | null;
              endDate: string | null;
            } = {
              startDate: dobValue.range.startDate?.toISOString() ?? null,
              endDate: dobValue.range.endDate?.toISOString() ?? null,
            };

            if (rangeData.startDate || rangeData.endDate) {
              return {
                field: dbFieldName,
                range: rangeData,
              } as unknown as SearchQueryField;
            }
          }
          break;
      }
    }

    return null;
  }

  private static convertStringToQuery(
    fieldName: (typeof STRING_FIELDS)[number],
    value: SearchFieldValue,
  ): SearchQueryField | null {
    const stringValues = Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string" && v !== "")
      : [String(value)].filter((v) => v !== "");

    if (stringValues.length === 0) return null;

    return {
      field: fieldName,
      values: stringValues,
    };
  }

  /**
   * Converts an array of SearchField to SearchQueryField array.
   */
  static convertSearchFieldsToSearchQuery(
    searchFields: SearchField[],
  ): SearchQueryField[] {
    const result: SearchQueryField[] = [];

    for (const field of searchFields) {
      if (field.compoundType) {
        // Convert compound field sub-fields
        for (const subField of field.fields) {
          const converted = this.convertToQueryField(subField);
          if (converted) {
            result.push(converted);
          }
        }
      } else {
        // Convert simple field
        const converted = this.convertToQueryField(field);
        if (converted) {
          result.push(converted);
        }
      }
    }

    return result;
  }
}
