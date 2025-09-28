import React, { useState, useCallback, useEffect, useRef } from "react";
import { DateModeSelector } from "./DateModeSelector";
import { SingleDatePicker } from "./SingleDatePicker";
import { DateRangeWithExtensions } from "./DateRangeWithExtensions";
import type { DateRange } from "~/types/searchFields";
import { EARLIEST_DATE, LATEST_DATE } from "~/lib/constants/dateBoundaries";

export type DateOfBirthMode = "single" | "range";

export interface DateOfBirthValue {
  mode: DateOfBirthMode;
  singleDate?: Date;
  range?: DateRange;
  extendBefore?: boolean;
  extendAfter?: boolean;
}

interface DateOfBirthPickerProps {
  initialValue?: DateOfBirthValue;
  onChange: (value: DateOfBirthValue) => void;
  ariaLabel?: string;
}

/**
 * DateOfBirthPicker component for selecting date of birth with two modes:
 * - Single date selection
 * - Date range selection
 *
 * Both modes support optional "extend before" and "extend after" toggles
 * that automatically extend the search range to implementation-defined boundaries
 */

export const DateOfBirthPicker: React.FC<DateOfBirthPickerProps> = ({
  initialValue,
  onChange,
  ariaLabel = "Select date of birth",
}) => {
  const [mode, setMode] = useState<DateOfBirthMode>(
    initialValue?.mode ?? "single",
  );
  const [currentValue, setCurrentValue] = useState<DateOfBirthValue>(
    initialValue ?? { mode: "single", extendBefore: false, extendAfter: false },
  );
  const isInitialMount = useRef(true);

  // Use ref to store stable onChange callback
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleModeChange = useCallback((newMode: DateOfBirthMode) => {
    setMode(newMode);

    setCurrentValue((prevValue) => {
      const newValue: DateOfBirthValue = {
        mode: newMode,
        singleDate: newMode === "single" ? prevValue.singleDate : undefined,
        range: newMode === "range" ? prevValue.range : undefined,
        extendBefore: prevValue.extendBefore,
        extendAfter: prevValue.extendAfter,
      };

      return newValue;
    });
  }, []);

  const handleSingleDateChange = useCallback((date: Date | undefined) => {
    setCurrentValue((prevValue) => {
      const newValue: DateOfBirthValue = {
        ...prevValue,
        singleDate: date,
      };

      // If we're in range mode with extension toggles enabled, update the range
      if (
        prevValue.mode === "range" &&
        (prevValue.extendBefore || prevValue.extendAfter)
      ) {
        if (date) {
          newValue.range = {
            startDate: prevValue.extendBefore ? EARLIEST_DATE : date,
            endDate: prevValue.extendAfter ? LATEST_DATE : date,
          };
        } else {
          // Clear range if date is cleared
          newValue.range = undefined;
        }
      }

      return newValue;
    });
  }, []);

  const handleRangeChange = useCallback((range: DateRange) => {
    setCurrentValue((prevValue) => {
      const newValue: DateOfBirthValue = {
        ...prevValue,
        range,
      };

      return newValue;
    });
  }, []);

  const handleToggleChange = useCallback(
    (field: "extendBefore" | "extendAfter", value: boolean) => {
      setCurrentValue((prevValue) => {
        const newValue: DateOfBirthValue = {
          ...prevValue,
          // If enabling one toggle, disable the other
          extendBefore: field === "extendBefore" ? value : false,
          extendAfter: field === "extendAfter" ? value : false,
        };

        // If we're in range mode, handle the transition to/from extension mode
        if (prevValue.mode === "range") {
          if (newValue.extendBefore || newValue.extendAfter) {
            // Switching to extension mode - preserve existing date values
            let preservedDate: Date | undefined;

            if (prevValue.singleDate) {
              // Already in extension mode, use the singleDate
              preservedDate = prevValue.singleDate;
            } else if (prevValue.range) {
              // Coming from regular range mode, preserve the appropriate date
              if (newValue.extendBefore && prevValue.range.endDate) {
                // Extending before - preserve the end date
                preservedDate = prevValue.range.endDate;
              } else if (newValue.extendAfter && prevValue.range.startDate) {
                // Extending after - preserve the start date
                preservedDate = prevValue.range.startDate;
              } else if (prevValue.range.startDate) {
                // Default to start date if available
                preservedDate = prevValue.range.startDate;
              } else if (prevValue.range.endDate) {
                // Fallback to end date if start date not available
                preservedDate = prevValue.range.endDate;
              }
            }

            if (preservedDate) {
              newValue.singleDate = preservedDate;
              newValue.range = {
                startDate: newValue.extendBefore
                  ? EARLIEST_DATE
                  : preservedDate,
                endDate: newValue.extendAfter ? LATEST_DATE : preservedDate,
              };
            }
          } else {
            // Switching back to regular range mode - clear extension-specific data
            newValue.singleDate = undefined;

            // Clear the range if it contains boundary dates (EARLIEST_DATE or LATEST_DATE)
            if (prevValue.range) {
              const hasBoundaryDates =
                (prevValue.range.startDate &&
                  (prevValue.range.startDate.getTime() ===
                    EARLIEST_DATE.getTime() ||
                    prevValue.range.startDate.getTime() ===
                      LATEST_DATE.getTime())) ||
                (prevValue.range.endDate &&
                  (prevValue.range.endDate.getTime() ===
                    EARLIEST_DATE.getTime() ||
                    prevValue.range.endDate.getTime() ===
                      LATEST_DATE.getTime()));

              if (hasBoundaryDates) {
                // Clear range if it contains boundary dates
                newValue.range = undefined;
              }
              // Otherwise keep the existing range (it has real user-selected dates)
            }
          }
        }

        return newValue;
      });
    },
    [],
  );

  // Call onChange when currentValue changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onChangeRef.current(currentValue);
  }, [currentValue]);

  const renderDateInput = () => {
    switch (mode) {
      case "single":
        return (
          <SingleDatePicker
            singleDate={currentValue.singleDate}
            onDateChange={handleSingleDateChange}
            ariaLabel="Select date of birth"
          />
        );
      case "range":
        return (
          <DateRangeWithExtensions
            range={currentValue.range}
            singleDate={currentValue.singleDate}
            extendBefore={currentValue.extendBefore ?? false}
            extendAfter={currentValue.extendAfter ?? false}
            onRangeChange={handleRangeChange}
            onSingleDateChange={handleSingleDateChange}
            onToggleChange={handleToggleChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3" role="group" aria-label={ariaLabel}>
      <DateModeSelector
        currentMode={mode}
        onModeChange={handleModeChange}
        ariaLabel="Select search type"
      />
      {renderDateInput()}
    </div>
  );
};
