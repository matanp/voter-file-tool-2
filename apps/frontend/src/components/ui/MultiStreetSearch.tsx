"use client";

import * as React from "react";
import { Button } from "~/components/ui/button";
import {
  MultiValueInputBase,
  type MultiValueInputBaseRef,
} from "./MultiValueInputBase";
import { cn } from "~/lib/utils";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import {
  SEARCH_DROPDOWN_WIDTH,
  SEARCH_BADGE_CONTAINER_MAX_WIDTH,
} from "~/lib/constants/sizing";

interface MultiStreetSearchProps {
  streets: string[];
  value?: string | string[];
  onChange: (values: string[]) => void;
  className?: string;
}

/**
 * Multi-value street input with debounced prefix-match suggestions.
 * Composes MultiValueInputBase with a suggestion overlay.
 */
export function MultiStreetSearch({
  streets,
  value,
  onChange,
  className,
}: MultiStreetSearchProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const debouncedSearch = useDebouncedValue(inputValue);
  const baseRef = React.useRef<MultiValueInputBaseRef>(null);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setSelectedIndex(-1); // Reset selection when input changes
  };

  const matches = React.useMemo(() => {
    if (!debouncedSearch.trim()) return [];

    const currentValues = Array.isArray(value) ? value : value ? [value] : [];

    return streets
      .filter((street) =>
        street.toLowerCase().startsWith(debouncedSearch.toLowerCase()),
      )
      .filter((street) => !currentValues.includes(street))
      .slice(0, 5);
  }, [streets, debouncedSearch, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const hasMatches = matches.length > 0 && inputValue !== "";

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hasMatches) {
        setSelectedIndex((prev) => (prev < matches.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hasMatches) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : matches.length - 1));
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (hasMatches) {
        const indexToAdd = selectedIndex >= 0 ? selectedIndex : 0;
        baseRef.current?.addValue(matches[indexToAdd]);
        setInputValue(""); // Clear input to hide suggestions
        setSelectedIndex(-1);
      }
      return;
    }

    if (e.key === ",") {
      e.preventDefault();
      if (hasMatches) {
        baseRef.current?.addValue(matches[0]);
        setInputValue(""); // Clear input to hide suggestions
        setSelectedIndex(-1);
      }
      return;
    }

    // Escape key to clear selection
    if (e.key === "Escape") {
      setSelectedIndex(-1);
      return;
    }
  };

  const handleBlur = () => {
    // Don't auto-add on blur for street search
    return;
  };

  const handleMatchClick = (match: string) => {
    baseRef.current?.addValue(match);
    setInputValue(""); // Clear input to hide suggestions
    setSelectedIndex(-1); // Reset selection
  };

  const suggestionOverlay = (
    <>
      {/* Show matches dropdown */}
      {matches.length > 0 && inputValue !== "" && debouncedSearch !== "" && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          <div className="space-y-1 p-2">
            {matches.map((match, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between rounded px-2 py-1",
                  selectedIndex === index &&
                    "bg-blue-50 border border-blue-200",
                )}
              >
                <span className="text-gray-700 text-sm">{match}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    handleMatchClick(match);
                  }}
                  className="text-xs px-2 py-1 h-6"
                >
                  {index === 0 ? "Add (enter)" : "Add"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <MultiValueInputBase
        ref={baseRef}
        placeholder="Enter Street(s)"
        value={value}
        onChange={onChange}
        inputClassName={cn(
          SEARCH_DROPDOWN_WIDTH,
          debouncedSearch !== "" &&
            matches.length === 0 &&
            inputValue !== "" &&
            "border-red-500",
        )}
        badgeContainerClassName={SEARCH_BADGE_CONTAINER_MAX_WIDTH}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onInputChange={handleInputChange}
        autoAddOnBlur={false}
      >
        {suggestionOverlay}
      </MultiValueInputBase>

      {/* Show error message for no matches */}
      {debouncedSearch !== "" && matches.length === 0 && inputValue !== "" && (
        <p className="text-destructive text-sm">No matches found</p>
      )}
    </div>
  );
}
