"use client";

import * as React from "react";
import { Cross2Icon } from "@radix-ui/react-icons";

import {
  SEARCH_DROPDOWN_MIN_HEIGHT,
  SEARCH_BADGE_CONTAINER_MAX_WIDTH,
} from "~/lib/constants/sizing";
import { Badge } from "~/components/ui/badge";
import {
  BaseCombobox,
  useComboboxInitialValues,
  type ComboboxItem,
} from "./BaseCombobox";

export interface MultiSelectComboboxProps {
  items: ComboboxItem[];
  initialValues?: string[];
  displayLabel: string;
  onSelect: (values: string[]) => void;
  maxDisplayItems?: number;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

/**
 * Multi-select combobox dropdown component.
 * Allows users to select multiple options from a filtered list with badge display.
 */
export function MultiSelectCombobox({
  items,
  initialValues = [],
  displayLabel,
  onSelect,
  maxDisplayItems = 3,
  ariaLabel,
  ariaDescribedBy,
}: MultiSelectComboboxProps) {
  const { values, setValues } = useComboboxInitialValues(initialValues, items);

  // Helper function to get label with fallback to prevent "undefined" display
  const getLabel = (value: string) => {
    return items.find((item) => item.value === value)?.label ?? value;
  };

  const handleSelect = (currentValue: string) => {
    const newValues = values.includes(currentValue)
      ? values.filter((value) => value !== currentValue)
      : [...values, currentValue];

    setValues(newValues);
    onSelect(newValues);
  };

  const handleRemoveValue = (valueToRemove: string) => {
    const newValues = values.filter((value) => value !== valueToRemove);
    setValues(newValues);
    onSelect(newValues);
  };

  const getDisplayText = () => {
    if (values.length === 0) {
      return displayLabel;
    }

    if (values.length <= maxDisplayItems) {
      return values.map(getLabel).join(", ");
    }

    const displayedValues = values
      .slice(0, maxDisplayItems)
      .map(getLabel)
      .join(", ");

    return `${displayedValues} +${values.length - maxDisplayItems} more`;
  };

  return (
    <div className="flex flex-col gap-2">
      <BaseCombobox
        items={items}
        displayLabel={displayLabel}
        placeholder={`Search ${displayLabel}`}
        buttonClassName={SEARCH_DROPDOWN_MIN_HEIGHT}
        onItemSelect={handleSelect}
        isItemSelected={(itemValue) => values.includes(itemValue)}
        ariaLabel={ariaLabel}
        ariaDescribedBy={ariaDescribedBy}
      >
        <span className="truncate text-left">{getDisplayText()}</span>
      </BaseCombobox>

      {/* Display selected values as badges */}
      {values.length > 0 && (
        <div
          className={`flex flex-wrap gap-1 ${SEARCH_BADGE_CONTAINER_MAX_WIDTH}`}
        >
          {values.slice(0, maxDisplayItems).map((value) => {
            const label = getLabel(value);
            return (
              <Badge
                key={value}
                variant="secondary"
                className="text-xs px-2 py-1"
              >
                {label}
                <button
                  type="button"
                  onClick={() => handleRemoveValue(value)}
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                  aria-label={`Remove ${label}`}
                  title={`Remove ${label}`}
                >
                  <Cross2Icon className="h-3 w-3" aria-hidden="true" />
                </button>
              </Badge>
            );
          })}
          {values.length > maxDisplayItems && (
            <Badge variant="outline" className="text-xs px-2 py-1">
              +{values.length - maxDisplayItems} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
