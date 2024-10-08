"use client";

import * as React from "react";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
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

interface ComboboxDropdownProps {
  items: { value: string; label: string }[];
  initialValue?: string;
  displayLabel: string;
  onSelect: (value: string) => void;
}

export function ComboboxDropdown({
  items,
  initialValue,
  displayLabel,
  onSelect,
}: ComboboxDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(initialValue ?? "");

  // these next 2 effects seem to solve some issues
  // this one handles the case where the items dynamically change and the current value is not in the list
  React.useEffect(() => {
    if (items.find((item) => item.value === value) === undefined) {
      setValue("");
    }
  }, [items, value]);

  // this allows initial values to be set, but ensuring that the value is in the list
  React.useEffect(() => {
    if (items.find((item) => item.value === initialValue) === undefined) {
      setValue("");
    } else {
      setValue(initialValue ?? "");
    }
  }, [initialValue, items]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value
            ? items.find((item) => item.value === value)?.label
            : displayLabel}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder={displayLabel} className="h-9" />
          <CommandList>
            <CommandEmpty>Nothing found</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    onSelect(currentValue);
                    setOpen(false);
                  }}
                >
                  {item.label}
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0",
                    )}
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
