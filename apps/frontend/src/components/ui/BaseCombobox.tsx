"use client";

import * as React from "react";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";

import { cn, reconcileInitialValues } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  SEARCH_DROPDOWN_WIDTH,
  SEARCH_POPOVER_WIDTH,
} from "~/lib/constants/sizing";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

export interface ComboboxItem {
  value: string;
  label: string;
}

interface BaseComboboxProps {
  items: ComboboxItem[];
  displayLabel: string;
  placeholder?: string;
  buttonClassName?: string;
  popoverClassName?: string;
  onItemSelect: (value: string) => void;
  isItemSelected: (value: string) => boolean;
  children: React.ReactNode;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  id?: string;
}

/**
 * Base combobox component that provides shared functionality for both single and multi-select comboboxes.
 * Handles popover state, command structure, filtering, and common UI elements.
 */
export function BaseCombobox({
  items,
  displayLabel,
  placeholder,
  buttonClassName,
  popoverClassName,
  onItemSelect,
  isItemSelected,
  children,
  ariaLabel,
  ariaDescribedBy,
  id,
}: BaseComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const filterFunction = React.useCallback(
    (value: string, search: string) => {
      const label = items.find((item) => item.value === value)?.label ?? "";
      return label.toLowerCase().startsWith(search.toLowerCase()) ? 1 : 0;
    },
    [items],
  );

  const comboboxId = React.useId();
  const listboxId = `${comboboxId}-listbox`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-label={ariaLabel ?? `Select ${displayLabel}`}
          aria-describedby={ariaDescribedBy}
          id={id}
          className={cn(
            SEARCH_DROPDOWN_WIDTH,
            "justify-between",
            buttonClassName,
          )}
        >
          {children}
          <CaretSortIcon
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(SEARCH_POPOVER_WIDTH, "p-0", popoverClassName)}
        role="listbox"
        id={listboxId}
        aria-label={`${displayLabel} options`}
      >
        <Command shouldFilter={true} filter={filterFunction}>
          <CommandInput
            placeholder={placeholder ?? `Search ${displayLabel}`}
            className="h-9"
            aria-label={`Search ${displayLabel}`}
          />
          <CommandList>
            <CommandEmpty>No options found</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={() => {
                    onItemSelect(item.value);
                    setOpen(false);
                  }}
                  role="option"
                  aria-selected={isItemSelected(item.value)}
                >
                  {item.label}
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      isItemSelected(item.value) ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Hook for managing initial value reconciliation
 */
export function useComboboxInitialValues(
  initialValues: string | string[],
  items: ComboboxItem[],
) {
  const [values, setValues] = React.useState<string[]>(() => {
    // Initialize values during first render
    const valuesArray = Array.isArray(initialValues)
      ? initialValues
      : [initialValues];
    return reconcileInitialValues(valuesArray, items);
  });

  // Track previous values to avoid unnecessary updates
  const prevInitialValuesRef = React.useRef(initialValues);
  const prevItemsRef = React.useRef(items);

  React.useEffect(() => {
    // Only update if initialValues or items actually changed
    const initialValuesChanged = prevInitialValuesRef.current !== initialValues;

    // Deep comparison for items array to avoid infinite loops
    const itemsChanged =
      prevItemsRef.current.length !== items.length ||
      prevItemsRef.current.some((prevItem, index) => {
        const currentItem = items[index];
        return (
          !currentItem ||
          prevItem.value !== currentItem.value ||
          prevItem.label !== currentItem.label
        );
      });

    if (initialValuesChanged || itemsChanged) {
      const valuesArray = Array.isArray(initialValues)
        ? initialValues
        : [initialValues];
      const reconciledValues = reconcileInitialValues(valuesArray, items);
      setValues(reconciledValues);

      prevInitialValuesRef.current = initialValues;
      prevItemsRef.current = items;
    }
  }, [initialValues, items]);

  return { values, setValues };
}
