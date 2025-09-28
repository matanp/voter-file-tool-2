"use client";

import * as React from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { SEARCH_DROPDOWN_WIDTH } from "~/lib/constants/sizing";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export interface DatePickerProps {
  initialValue?: Date;
  onChange: (date: Date) => void;
  ariaLabel?: string;
}

const NUM_YEARS = 125;

export const DatePicker: React.FC<DatePickerProps> = ({
  initialValue,
  onChange,
  ariaLabel,
}) => {
  const [date, setDate] = React.useState<Date | undefined>(initialValue);
  const [isOpen, setIsOpen] = React.useState(false);

  const years = Array.from(
    { length: NUM_YEARS },
    (_, i) => new Date().getFullYear() - NUM_YEARS + i,
  ).reverse();

  const months = Array.from({ length: 12 }, (_, i) =>
    new Date(0, i).toLocaleString("default", { month: "long" }),
  );

  // Sync internal state with initialValue prop changes
  React.useEffect(() => {
    const currentTime = date?.getTime();
    const newTime = initialValue?.getTime();

    if (currentTime !== newTime) {
      setDate(initialValue);
    }
  }, [initialValue, date]);

  React.useEffect(() => {
    if (date) {
      onChange(date);
    }
  }, [date, onChange]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            `${SEARCH_DROPDOWN_WIDTH} justify-start text-left font-normal`,
            !date && "text-muted-foreground",
          )}
          aria-label={ariaLabel ?? "Select date"}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          month={date}
          onSelect={(newDay) => {
            setDate((currentDate) => {
              const newDate = currentDate ? new Date(currentDate) : new Date();
              newDate.setDate(newDay ? newDay.getDate() : newDate.getDate());
              return newDate;
            });
            setIsOpen(false);
          }}
          initialFocus
          components={{
            Caption: ({ displayMonth }) => {
              const currentYear = date
                ? date.getFullYear().toString()
                : displayMonth.getFullYear().toString();

              const currentMonth = date
                ? date.getMonth()
                : displayMonth.getMonth();

              return (
                <div className="flex justify-center gap-2 py-2">
                  <Select
                    value={months[currentMonth]}
                    onValueChange={(newMonth) => {
                      setDate((currentDate) => {
                        const newDate = currentDate
                          ? new Date(currentDate)
                          : new Date(displayMonth);
                        newDate.setMonth(months.indexOf(newMonth));
                        return newDate;
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue>{months[currentMonth]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={index} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={currentYear}
                    onValueChange={(newYear) => {
                      setDate((currentDate) => {
                        const newDate = currentDate
                          ? new Date(currentDate)
                          : new Date(displayMonth);
                        newDate.setFullYear(parseInt(newYear));
                        return newDate;
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue>{currentYear}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            },
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
