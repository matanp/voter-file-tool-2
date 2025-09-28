import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { MultiSelectCombobox } from "~/components/ui/MultiSelectCombobox";
import { MultiStringInput } from "~/components/ui/MultiStringInput";
import { MultiStreetSearch } from "~/components/ui/MultiStreetSearch";
import { DatePicker } from "~/components/ui/datePicker";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { StreetSearch } from "~/app/recordsearch/StreetSearch";
import { CityTownSearch } from "~/app/recordsearch/CityTownSearch";
import { isDropdownItem } from "~/app/api/lib/utils";
import type { BaseSearchField, SearchFieldValue } from "~/types/searchFields";
import type { DropdownLists } from "@prisma/client";
import {
  FIELD_TYPES,
  getDropdownItems,
  getDropdownDisplayLabel,
} from "~/lib/searchHelpers";
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

// Compile-time exhaustive check function
const assertExhaustive = (value: never): never => {
  throw new Error(`Unhandled field type: ${String(value)}`);
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

  const dropdownItems = useMemo(() => {
    if (field.type === FIELD_TYPES.DROPDOWN && isDropdownItem(field.name)) {
      return getDropdownItems(field.name, dropdownList);
    }
    return [];
  }, [field.type, field.name, dropdownList]);

  const cityItems = useMemo(() => {
    if (field.type === FIELD_TYPES.CITY_TOWN && field.allowMultiple) {
      return getDropdownItems("city", dropdownList);
    }
    return [];
  }, [field.type, field.allowMultiple, dropdownList]);

  const handleCityTownChange = useCallback(
    (city: string, town: string) => {
      onValueChange(city);
      // TODO: Handle town value separately if needed
      void town; // Suppress unused parameter warning
    },
    [onValueChange],
  );

  const handleCheckboxChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onValueChange(checked === "indeterminate" ? undefined : checked);
    },
    [onValueChange],
  );

  const handleStringInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange(e.target.value);
    },
    [onValueChange],
  );

  const handleNumberInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange(e.target.value === "" ? undefined : Number(e.target.value));
    },
    [onValueChange],
  );

  switch (field.type) {
    case FIELD_TYPES.DROPDOWN: {
      if (!isDropdownItem(field.name)) {
        return null;
      }

      const displayLabel = getDropdownDisplayLabel(
        field.displayName,
        field.allowMultiple ?? false,
      );

      if (field.allowMultiple) {
        return (
          <MultiSelectCombobox
            items={dropdownItems}
            displayLabel={displayLabel}
            initialValues={Array.isArray(field.value) ? field.value : []}
            onSelect={onValueChange}
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

    case FIELD_TYPES.DATETIME: {
      return (
        <DatePicker
          key={`date-${String(field.value)}`}
          initialValue={field.value instanceof Date ? field.value : undefined}
          onChange={onValueChange}
          ariaLabel={`Select ${fieldLabel}`}
        />
      );
    }

    case FIELD_TYPES.STREET: {
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

    case FIELD_TYPES.CITY_TOWN: {
      if (field.allowMultiple) {
        return (
          <MultiSelectCombobox
            items={cityItems}
            displayLabel="Select Cities"
            initialValues={Array.isArray(field.value) ? field.value : []}
            onSelect={onValueChange}
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

    case FIELD_TYPES.BOOLEAN: {
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={fieldId}
            checked={field.value === true}
            onCheckedChange={handleCheckboxChange}
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

    case FIELD_TYPES.STRING: {
      if (field.allowMultiple) {
        const placeholder = isCompoundField
          ? `Enter ${field.displayName}(s)`
          : `Enter ${field.displayName}(s)`;

        return (
          <MultiStringInput
            placeholder={placeholder}
            value={getMultiStringValue(field.value)}
            onChange={onValueChange}
          />
        );
      } else {
        return (
          <Input
            type="text"
            placeholder={`Enter ${field.displayName}`}
            value={
              typeof field.value === "string" || typeof field.value === "number"
                ? String(field.value)
                : ""
            }
            onChange={handleStringInputChange}
            aria-label={`Enter ${fieldLabel}`}
            id={fieldId}
          />
        );
      }
    }

    case FIELD_TYPES.NUMBER: {
      return (
        <Input
          type="number"
          placeholder={`Enter ${field.displayName}`}
          value={typeof field.value === "number" ? field.value : undefined}
          onChange={handleNumberInputChange}
          aria-label={`Enter ${fieldLabel}`}
          id={fieldId}
        />
      );
    }

    case FIELD_TYPES.HIDDEN: {
      return null;
    }

    default: {
      return assertExhaustive(field.type);
    }
  }
};
