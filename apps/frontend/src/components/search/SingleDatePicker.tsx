import React from "react";
import { DatePicker } from "~/components/ui/datePicker";

interface SingleDatePickerProps {
  singleDate?: Date;
  onDateChange: (date: Date | undefined) => void;
  ariaLabel?: string;
}

/**
 * SingleDatePicker component for single date selection.
 * Shows a simple date picker without extension toggles.
 */
export const SingleDatePicker: React.FC<SingleDatePickerProps> = ({
  singleDate,
  onDateChange,
  ariaLabel = "Select date of birth",
}) => {
  return (
    <DatePicker
      initialValue={singleDate}
      onChange={onDateChange}
      ariaLabel={ariaLabel}
    />
  );
};
