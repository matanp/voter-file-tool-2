import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { MultiSelectCombobox } from "~/components/ui/MultiSelectCombobox";
import { MultiStringInput } from "~/components/ui/MultiStringInput";
import { MultiStreetSearch } from "~/components/ui/MultiStreetSearch";
import { DatePicker } from "~/components/ui/datePicker";
import { DateOfBirthPicker } from "./DateOfBirthPicker";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { StreetSearch } from "~/app/recordsearch/StreetSearch";
import { CityTownSearch } from "~/app/recordsearch/CityTownSearch";
import { isDropdownItem } from "~/app/api/lib/utils";
import type { BaseSearchField, SearchFieldValue } from "~/types/searchFields";
import type { DropdownLists } from "@prisma/client";
import { getDropdownItems } from "~/lib/searchHelpers";
import { SEARCH_CONFIG } from "~/lib/searchConfiguration";
import { useInputHandlers } from "~/lib/searchEventHandlers";
import { SearchFieldProcessor } from "~/lib/searchFieldProcessor";
import { useMemo, useCallback } from "react";

export interface FieldRendererProps {
  field: BaseSearchField;
  dropdownList: DropdownLists;
  onValueChange: (value: SearchFieldValue) => void;
  index?: number;
  subIndex?: number;
}

// Helper function to get input value for multi-string inputs
const getMultiStringValue = (value: unknown): string | string[] | undefined => {
  if (Array.isArray(value)) {
    // Type guard to ensure all elements are strings
    return value.every((item): item is string => typeof item === "string")
      ? value
      : undefined;
  }
  if (typeof value === "string") return value;
  return undefined;
};

export const FieldRenderer: React.FC<FieldRendererProps> = ({
  field,
  dropdownList,
  onValueChange,
  index,
  subIndex,
}) => {
  const isCompoundField = index !== undefined && subIndex !== undefined;
  const fieldId = `${field.name}-${index ?? 0}-${subIndex ?? 0}`;
  const fieldLabel = `${field.displayName}${isCompoundField ? ` (part ${(subIndex ?? 0) + 1})` : ""}`;

  const inputHandlers = useInputHandlers(onValueChange, field);

  // Memoize dropdown items to prevent unnecessary recalculations
  const dropdownItems = useMemo(() => {
    if (
      field.type === SEARCH_CONFIG.fieldTypes.DROPDOWN &&
      isDropdownItem(field.name)
    ) {
      return getDropdownItems(field.name, dropdownList);
    }
    return [];
  }, [field.type, field.name, dropdownList]);

  // Memoize city items for city/town fields
  const cityItems = useMemo(() => {
    if (
      field.type === SEARCH_CONFIG.fieldTypes.CITY_TOWN &&
      field.allowMultiple
    ) {
      return getDropdownItems("city", dropdownList);
    }
    return [];
  }, [field.type, field.allowMultiple, dropdownList]);

  // Memoize display label for dropdown fields
  const displayLabel = useMemo(() => {
    if (
      field.type === SEARCH_CONFIG.fieldTypes.DROPDOWN &&
      isDropdownItem(field.name)
    ) {
      return SearchFieldProcessor.getDropdownDisplayLabel(
        field.displayName,
        field.allowMultiple ?? false,
      );
    }
    return field.displayName;
  }, [field.type, field.name, field.displayName, field.allowMultiple]);

  // Memoize placeholder text
  const placeholder = useMemo(() => {
    return SearchFieldProcessor.getPlaceholder(
      field.displayName,
      field.type,
      field.allowMultiple,
    );
  }, [field.displayName, field.type, field.allowMultiple]);

  const handleCityTownChange = useCallback(
    (city: string, town: string) => {
      onValueChange(city);
      // TODO: Handle town value separately if needed
      void town; // Suppress unused parameter warning
    },
    [onValueChange],
  );

  switch (field.type) {
    case SEARCH_CONFIG.fieldTypes.DROPDOWN: {
      if (!isDropdownItem(field.name)) {
        return null;
      }

      if (field.allowMultiple) {
        return (
          <MultiSelectCombobox
            items={dropdownItems}
            displayLabel={displayLabel}
            initialValues={Array.isArray(field.value) ? field.value : []}
            onSelect={inputHandlers.handleDropdownChange}
            ariaLabel={`Select multiple ${fieldLabel}`}
          />
        );
      } else {
        return (
          <ComboboxDropdown
            key={`${field.name}-${String(field.value)}`}
            items={dropdownItems}
            initialValue={typeof field.value === "string" ? field.value : ""}
            displayLabel={displayLabel}
            onSelect={onValueChange}
            ariaLabel={`Select ${fieldLabel}`}
          />
        );
      }
    }

    case SEARCH_CONFIG.fieldTypes.DATETIME: {
      return (
        <DatePicker
          key={`date-${field.name}-${index ?? 0}`}
          initialValue={field.value instanceof Date ? field.value : undefined}
          onChange={inputHandlers.handleDateChange}
          ariaLabel={`Select ${fieldLabel}`}
        />
      );
    }

    case SEARCH_CONFIG.fieldTypes.DATE_OF_BIRTH: {
      return (
        <DateOfBirthPicker
          key={`date-of-birth-${field.name}-${index ?? 0}`}
          initialValue={
            field.value &&
            typeof field.value === "object" &&
            "mode" in field.value
              ? field.value
              : undefined
          }
          onChange={inputHandlers.handleDateOfBirthChange}
          ariaLabel={`Select ${fieldLabel}`}
        />
      );
    }

    case SEARCH_CONFIG.fieldTypes.STREET: {
      if (field.allowMultiple) {
        return (
          <MultiStreetSearch
            streets={dropdownList.street}
            value={
              Array.isArray(field.value)
                ? field.value
                : typeof field.value === "string"
                  ? field.value
                  : undefined
            }
            onChange={onValueChange}
          />
        );
      } else {
        return (
          <StreetSearch
            key={`street-${String(field.value)}`}
            streets={dropdownList.street}
            initialValue={typeof field.value === "string" ? field.value : ""}
            onChange={onValueChange}
          />
        );
      }
    }

    case SEARCH_CONFIG.fieldTypes.CITY_TOWN: {
      if (field.allowMultiple) {
        return (
          <MultiSelectCombobox
            items={cityItems}
            displayLabel="Select Cities"
            initialValues={Array.isArray(field.value) ? field.value : []}
            onSelect={inputHandlers.handleDropdownChange}
          />
        );
      } else {
        return (
          <CityTownSearch
            key={`city-town-${String(field.value)}`}
            cities={dropdownList.city}
            initialCity={typeof field.value === "string" ? field.value : ""}
            onChange={handleCityTownChange}
          />
        );
      }
    }

    case SEARCH_CONFIG.fieldTypes.BOOLEAN: {
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={fieldId}
            checked={field.value === true}
            onCheckedChange={inputHandlers.handleCheckboxChange}
          />
          <label
            htmlFor={fieldId}
            className="text-sm font-medium text-gray-700 cursor-pointer"
          >
            {field.displayName}
          </label>
        </div>
      );
    }

    case SEARCH_CONFIG.fieldTypes.STRING: {
      if (field.allowMultiple) {
        return (
          <MultiStringInput
            placeholder={placeholder}
            value={getMultiStringValue(field.value)}
            onChange={inputHandlers.handleMultiStringChange}
            aria-label={`Enter ${fieldLabel}`}
            id={fieldId}
          />
        );
      } else {
        return (
          <Input
            type="text"
            placeholder={placeholder}
            value={
              typeof field.value === "string" || typeof field.value === "number"
                ? String(field.value)
                : ""
            }
            onChange={inputHandlers.handleStringInputChange}
            aria-label={`Enter ${fieldLabel}`}
            id={fieldId}
          />
        );
      }
    }

    case SEARCH_CONFIG.fieldTypes.NUMBER: {
      return (
        <Input
          type="number"
          placeholder={placeholder}
          value={field.value != null ? String(field.value) : ""}
          onChange={inputHandlers.handleNumberInputChange}
          aria-label={`Enter ${fieldLabel}`}
          id={fieldId}
        />
      );
    }

    case SEARCH_CONFIG.fieldTypes.HIDDEN: {
      return null;
    }

    default: {
      console.warn(`Unknown field type: ${String(field.type)}`);
      return null;
    }
  }
};
