import React from "react";
import { Calendar } from "lucide-react";
import { DatePicker } from "~/components/ui/datePicker";
import { ExtensionToggles } from "./ExtensionToggles";
import type { DateRange } from "~/types/searchFields";

interface DateRangeWithExtensionsProps {
  range?: DateRange;
  singleDate?: Date;
  extendBefore: boolean;
  extendAfter: boolean;
  onRangeChange: (range: DateRange) => void;
  onSingleDateChange: (date: Date | undefined) => void;
  onToggleChange: (
    field: "extendBefore" | "extendAfter",
    value: boolean,
  ) => void;
}

/**
 * DateRangeWithExtensions component for date range selection with optional extensions.
 * Handles both regular range selection and single date with extensions.
 */
export const DateRangeWithExtensions: React.FC<
  DateRangeWithExtensionsProps
> = ({
  range,
  singleDate,
  extendBefore,
  extendAfter,
  onRangeChange,
  onSingleDateChange,
  onToggleChange,
}) => {
  // If extension is enabled, show only one date picker
  if (extendBefore || extendAfter) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {extendBefore ? "And Before" : "And After"}
          </label>
          <DatePicker
            initialValue={singleDate}
            onChange={onSingleDateChange}
            ariaLabel={
              extendBefore
                ? "Select date - will search from earliest date to this date"
                : "Select date - will search from this date to latest date"
            }
          />
        </div>
        <ExtensionToggles
          extendBefore={extendBefore}
          extendAfter={extendAfter}
          onToggleChange={onToggleChange}
        />
      </div>
    );
  }

  // Regular range mode
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From
          </label>
          <DatePicker
            initialValue={range?.startDate}
            onChange={(date) =>
              onRangeChange({
                startDate: date,
                endDate: range?.endDate,
              })
            }
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
            initialValue={range?.endDate}
            onChange={(date) =>
              onRangeChange({
                startDate: range?.startDate,
                endDate: date,
              })
            }
            ariaLabel="Select end date"
          />
        </div>
      </div>
      <ExtensionToggles
        extendBefore={extendBefore}
        extendAfter={extendAfter}
        onToggleChange={onToggleChange}
      />
    </div>
  );
};
