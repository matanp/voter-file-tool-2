"use client";

import * as React from "react";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Cross2Icon } from "@radix-ui/react-icons";
import { cn } from "~/lib/utils";
import {
  SEARCH_INPUT_MIN_WIDTH,
  SEARCH_BADGE_MAX_WIDTH,
} from "~/lib/constants/sizing";

interface MultiValueInputBaseProps {
  placeholder: string;
  value?: string | string[];
  onChange: (value: string[]) => void;
  className?: string;
  inputClassName?: string;
  badgeContainerClassName?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  onInputChange?: (value: string) => void; // Callback for input value changes
  children?: React.ReactNode; // For suggestion overlays
}

export interface MultiValueInputBaseRef {
  addValue: (value?: string) => void;
  getInputValue: () => string;
}

/**
 * Base component for multi-value text inputs with shared state management,
 * tokenization, and badge rendering logic.
 */
export const MultiValueInputBase = React.forwardRef<
  MultiValueInputBaseRef,
  MultiValueInputBaseProps
>(
  (
    {
      placeholder,
      value,
      onChange,
      className,
      inputClassName,
      badgeContainerClassName,
      onKeyDown,
      onBlur,
      onInputChange,
      children,
    },
    ref,
  ) => {
    const [inputValue, setInputValue] = React.useState("");
    const [values, setValues] = React.useState<string[]>([]);

    // Initialize values from props
    React.useEffect(() => {
      if (Array.isArray(value)) {
        setValues(value);
      } else if (typeof value === "string" && value.trim() !== "") {
        setValues([value]);
      } else {
        setValues([]);
      }
    }, [value]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addValue();
      }
      onKeyDown?.(e);
    };

    const handleBlur = () => {
      addValue();
      onBlur?.();
    };

    const addValue = (valueToAdd?: string) => {
      const trimmedValue = (valueToAdd ?? inputValue).trim();
      if (trimmedValue && !values.includes(trimmedValue)) {
        const newValues = [...values, trimmedValue];
        setValues(newValues);
        onChange(newValues);
      }
      setInputValue("");
    };

    // Expose functions via ref
    React.useImperativeHandle(ref, () => ({
      addValue,
      getInputValue: () => inputValue,
    }));

    const removeValue = (valueToRemove: string) => {
      const newValues = values.filter((v) => v !== valueToRemove);
      setValues(newValues);
      onChange(newValues);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onInputChange?.(newValue);
    };

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="relative">
          <Input
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={cn(SEARCH_INPUT_MIN_WIDTH, inputClassName)}
          />
          {children}
        </div>

        {/* Display selected values as badges */}
        {values.length > 0 && (
          <div
            className={cn(
              "flex flex-wrap gap-1",
              SEARCH_BADGE_MAX_WIDTH,
              badgeContainerClassName,
            )}
          >
            {values.map((value) => (
              <Badge
                key={value}
                variant="secondary"
                className="text-xs px-2 py-1"
              >
                {value}
                <button
                  type="button"
                  onClick={() => removeValue(value)}
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                >
                  <Cross2Icon className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  },
);

MultiValueInputBase.displayName = "MultiValueInputBase";
