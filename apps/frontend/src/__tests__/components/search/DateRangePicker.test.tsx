import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateRangePicker } from "~/components/search/DateRangePicker";
import type { DateRange } from "~/types/searchFields";

// Mock the DatePicker component
jest.mock("~/components/ui/datePicker", () => ({
  DatePicker: ({ initialValue, onChange, ariaLabel }: any) => (
    <input
      data-testid="date-picker"
      aria-label={ariaLabel}
      type="date"
      value={initialValue ? initialValue.toISOString().split("T")[0] : ""}
      onChange={(e) => {
        const date = e.target.value ? new Date(e.target.value) : undefined;
        onChange(date);
      }}
    />
  ),
}));

describe("DateRangePicker", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("renders with default props", () => {
    render(<DateRangePicker onChange={mockOnChange} />);

    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("To")).toBeInTheDocument();
    expect(screen.getAllByTestId("date-picker")).toHaveLength(2);
  });

  it("renders with initial value", () => {
    const initialValue: DateRange = {
      startDate: new Date("2023-01-01"),
      endDate: new Date("2023-12-31"),
    };

    render(
      <DateRangePicker initialValue={initialValue} onChange={mockOnChange} />,
    );

    const datePickers = screen.getAllByTestId("date-picker");
    expect(datePickers[0]).toHaveValue("2023-01-01");
    expect(datePickers[1]).toHaveValue("2023-12-31");
  });

  it("calls onChange when start date changes", () => {
    render(<DateRangePicker onChange={mockOnChange} />);

    const startDatePicker = screen.getAllByTestId("date-picker")[0];
    fireEvent.change(startDatePicker, { target: { value: "2023-06-15" } });

    expect(mockOnChange).toHaveBeenCalledWith({
      startDate: new Date("2023-06-15"),
      endDate: undefined,
    });
  });

  it("calls onChange when end date changes", () => {
    render(<DateRangePicker onChange={mockOnChange} />);

    const endDatePicker = screen.getAllByTestId("date-picker")[1];
    fireEvent.change(endDatePicker, { target: { value: "2023-12-31" } });

    expect(mockOnChange).toHaveBeenCalledWith({
      startDate: undefined,
      endDate: new Date("2023-12-31"),
    });
  });

  it("preserves existing values when updating one date", () => {
    const initialValue: DateRange = {
      startDate: new Date("2023-01-01"),
      endDate: new Date("2023-12-31"),
    };

    render(
      <DateRangePicker initialValue={initialValue} onChange={mockOnChange} />,
    );

    const startDatePicker = screen.getAllByTestId("date-picker")[0];
    fireEvent.change(startDatePicker, { target: { value: "2023-06-15" } });

    expect(mockOnChange).toHaveBeenCalledWith({
      startDate: new Date("2023-06-15"),
      endDate: new Date("2023-12-31"),
    });
  });

  it("handles clearing dates", () => {
    const initialValue: DateRange = {
      startDate: new Date("2023-01-01"),
      endDate: new Date("2023-12-31"),
    };

    render(
      <DateRangePicker initialValue={initialValue} onChange={mockOnChange} />,
    );

    const startDatePicker = screen.getAllByTestId("date-picker")[0];
    fireEvent.change(startDatePicker, { target: { value: "" } });

    expect(mockOnChange).toHaveBeenCalledWith({
      startDate: undefined,
      endDate: new Date("2023-12-31"),
    });
  });

  it("has proper accessibility attributes", () => {
    render(
      <DateRangePicker
        onChange={mockOnChange}
        ariaLabel="Select birth date range"
      />,
    );

    const group = screen.getByRole("group");
    expect(group).toHaveAttribute("aria-label", "Select birth date range");

    const datePickers = screen.getAllByTestId("date-picker");
    expect(datePickers[0]).toHaveAttribute("aria-label", "Select start date");
    expect(datePickers[1]).toHaveAttribute("aria-label", "Select end date");
  });
});
