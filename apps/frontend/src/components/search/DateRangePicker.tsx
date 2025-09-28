import React, { useCallback, useRef } from "react";
import { Calendar } from "lucide-react";
import { DatePicker } from "~/components/ui/datePicker";
import type { DateRange } from "~/types/searchFields";

interface DateRangePickerProps {
  initialValue?: DateRange;
  onChange: (range: DateRange) => void;
  ariaLabel?: string;
}

/**
 * DateRangePicker component for selecting date ranges
 * Renders two DatePicker components side by side for start and end dates
 */
export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  initialValue,
  onChange,
  ariaLabel = "Select date range",
}) => {
  // Use refs to maintain current values without causing re-renders
  const currentRangeRef = useRef<DateRange>(initialValue ?? {});
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleStartDateChange = useCallback((date: Date | undefined) => {
    const newRange = {
      startDate: date,
      endDate: currentRangeRef.current.endDate,
    };
    currentRangeRef.current = newRange;
    onChangeRef.current(newRange);
  }, []);

  const handleEndDateChange = useCallback((date: Date | undefined) => {
    const newRange = {
      startDate: currentRangeRef.current.startDate,
      endDate: date,
    };
    currentRangeRef.current = newRange;
    onChangeRef.current(newRange);
  }, []);

  // Update ref when initialValue changes
  React.useEffect(() => {
    currentRangeRef.current = initialValue ?? {};
  }, [initialValue]);

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label={ariaLabel}
    >
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          From
        </label>
        <DatePicker
          initialValue={initialValue?.startDate}
          onChange={handleStartDateChange}
          ariaLabel="Select start date"
        />
      </div>

      <div className="flex items-center justify-center pt-6">
        <Calendar className="h-4 w-4 text-gray-400" />
      </div>

      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          To
        </label>
        <DatePicker
          initialValue={initialValue?.endDate}
          onChange={handleEndDateChange}
          ariaLabel="Select end date"
        />
      </div>
    </div>
  );
};
