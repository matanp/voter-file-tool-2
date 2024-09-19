"use client";

import * as React from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
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

interface DatePickerProps {
  onChange: (date: Date) => void;
}

export const DatePicker: React.FC<DatePickerProps> = ({ onChange }) => {
  const [date, setDate] = React.useState<Date>();
  const years = Array.from(
    { length: 125 },
    (_, i) => new Date().getFullYear() - 125 + i,
  );

  const months = Array.from({ length: 12 }, (_, i) =>
    new Date(0, i).toLocaleString("default", { month: "long" }),
  );

  React.useEffect(() => {
    if (date) {
      onChange(date);
    }
  }, [date, onChange]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDay) => {
            setDate((currentDate) => {
              const newDate = currentDate ? new Date(currentDate) : new Date();
              newDate.setDate(newDay ? newDay.getDate() : newDate.getDate());
              return newDate;
            });
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
