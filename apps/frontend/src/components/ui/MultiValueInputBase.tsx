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

interface MultiValueInputBaseProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "placeholder"
  > {
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
  autoAddOnBlur?: boolean; // Whether to auto-add values on blur (default: true)
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
      autoAddOnBlur = true,
      ...inputProps
    },
    ref,
  ) => {
    const [inputValue, setInputValue] = React.useState("");
    const [values, setValues] = React.useState<string[]>(() => {
      // Initialize values from props during initial render
      if (Array.isArray(value)) {
        return value;
      } else if (typeof value === "string" && value.trim() !== "") {
        return [value];
      } else {
        return [];
      }
    });

    // Track previous value to avoid unnecessary updates
    const prevValueRef = React.useRef(value);
    const isInitialRender = React.useRef(true);
    const onChangeRef = React.useRef(onChange);
    const isPropUpdateRef = React.useRef(false);

    // Keep onChange ref up to date
    React.useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // Update values when props change, but avoid unnecessary updates
    React.useEffect(() => {
      // Only update if the value prop actually changed
      if (prevValueRef.current !== value) {
        const newValues = Array.isArray(value)
          ? value
          : typeof value === "string" && value.trim() !== ""
            ? [value]
            : [];

        // Mark this as a prop-driven update to prevent duplicate onChange calls
        isPropUpdateRef.current = true;
        setValues(newValues);
        prevValueRef.current = value;
      }
    }, [value]);

    // Call onChange when values change (but not during initial render or prop updates)
    React.useEffect(() => {
      if (!isInitialRender.current && !isPropUpdateRef.current) {
        onChangeRef.current(values);
      }
      // Reset the prop update flag after checking it
      isPropUpdateRef.current = false;
      isInitialRender.current = false;
    }, [values]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);

      // Only handle Enter/Comma if the event wasn't already handled by parent
      if (!e.defaultPrevented && (e.key === "Enter" || e.key === ",")) {
        e.preventDefault();
        addValue();
      }
    };

    const handleBlur = () => {
      if (autoAddOnBlur) {
        addValue();
      }
      onBlur?.();
    };

    const addValue = (valueToAdd?: string) => {
      const trimmedValue = (valueToAdd ?? inputValue).trim();
      if (trimmedValue) {
        setValues((prevValues) => {
          if (!prevValues.includes(trimmedValue)) {
            return [...prevValues, trimmedValue];
          }
          return prevValues;
        });
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
            {...inputProps}
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
