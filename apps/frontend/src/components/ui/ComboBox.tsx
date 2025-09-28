"use client";

import * as React from "react";
import {
  BaseCombobox,
  useComboboxInitialValues,
  type ComboboxItem,
} from "./BaseCombobox";

export interface ComboboxDropdownProps {
  items: ComboboxItem[];
  initialValue?: string;
  displayLabel: string;
  onSelect: (value: string) => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

/**
 * Single-select combobox dropdown component.
 * Allows users to select one option from a filtered list.
 */
export function ComboboxDropdown({
  items,
  initialValue,
  displayLabel,
  onSelect,
  ariaLabel,
  ariaDescribedBy,
}: ComboboxDropdownProps) {
  const { values, setValues } = useComboboxInitialValues(
    initialValue ?? "",
    items,
  );
  const value = values[0] ?? "";

  const valueDisplayText = value
    ? (items.find((item) => item.value === value)?.label ?? displayLabel)
    : displayLabel;

  const handleSelect = (currentValue: string) => {
    const newValue = currentValue === value ? "" : currentValue;
    setValues(newValue ? [newValue] : []);
    onSelect(newValue);
  };

  return (
    <BaseCombobox
      items={items}
      displayLabel={displayLabel}
      buttonClassName={
        valueDisplayText && valueDisplayText.length > 22
          ? "text-xs font-semibold"
          : ""
      }
      onItemSelect={handleSelect}
      isItemSelected={(itemValue) => itemValue === value}
      ariaLabel={ariaLabel}
      ariaDescribedBy={ariaDescribedBy}
    >
      {valueDisplayText}
    </BaseCombobox>
  );
}
