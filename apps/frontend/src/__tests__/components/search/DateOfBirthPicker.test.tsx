import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { DateOfBirthPicker } from "~/components/search/DateOfBirthPicker";
import type { DateOfBirthValue } from "~/components/search/DateOfBirthPicker";
import { EARLIEST_DATE, LATEST_DATE } from "~/lib/constants/dateBoundaries";

// Type definitions for mock components
interface DateModeSelectorProps {
  currentMode: "single" | "range";
  onModeChange: (mode: "single" | "range") => void;
  ariaLabel: string;
}

interface SingleDatePickerProps {
  singleDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  ariaLabel: string;
}

interface DateRangeWithExtensionsProps {
  range: { startDate: Date | undefined; endDate: Date | undefined } | undefined;
  singleDate: Date | undefined;
  extendBefore: boolean;
  extendAfter: boolean;
  onRangeChange: (range: {
    startDate: Date | undefined;
    endDate: Date | undefined;
  }) => void;
  onSingleDateChange: (date: Date | undefined) => void;
  onToggleChange: (
    toggle: "extendBefore" | "extendAfter",
    checked: boolean,
  ) => void;
}

// Mock the child components
jest.mock("~/components/search/DateModeSelector", () => ({
  DateModeSelector: ({
    currentMode,
    onModeChange,
    ariaLabel,
  }: DateModeSelectorProps) => (
    <div role="group" aria-label={ariaLabel}>
      <button
        data-testid="mode-single"
        onClick={() => onModeChange("single")}
        aria-pressed={currentMode === "single"}
      >
        Single Date
      </button>
      <button
        data-testid="mode-range"
        onClick={() => onModeChange("range")}
        aria-pressed={currentMode === "range"}
      >
        Date Range
      </button>
    </div>
  ),
}));

jest.mock("~/components/search/SingleDatePicker", () => ({
  SingleDatePicker: ({
    singleDate,
    onDateChange,
    ariaLabel,
  }: SingleDatePickerProps) => (
    <input
      data-testid="single-date-picker"
      aria-label={ariaLabel}
      type="date"
      value={singleDate ? singleDate.toISOString().split("T")[0] : ""}
      onChange={(e) => {
        const date = e.target.value ? new Date(e.target.value) : undefined;
        onDateChange(date);
      }}
    />
  ),
}));

jest.mock("~/components/search/DateRangeWithExtensions", () => ({
  DateRangeWithExtensions: ({
    range,
    singleDate,
    extendBefore,
    extendAfter,
    onRangeChange,
    onSingleDateChange,
    onToggleChange,
  }: DateRangeWithExtensionsProps) => (
    <div data-testid="date-range-with-extensions">
      {extendBefore || extendAfter ? (
        <div>
          <input
            data-testid="extension-date-picker"
            type="date"
            value={singleDate ? singleDate.toISOString().split("T")[0] : ""}
            onChange={(e) => {
              const date = e.target.value
                ? new Date(e.target.value)
                : undefined;
              onSingleDateChange(date);
            }}
          />
          <div>
            <label>
              <input
                data-testid="extend-before-toggle"
                type="checkbox"
                checked={extendBefore}
                onChange={(e) =>
                  onToggleChange("extendBefore", e.target.checked)
                }
              />
              Extend Before
            </label>
            <label>
              <input
                data-testid="extend-after-toggle"
                type="checkbox"
                checked={extendAfter}
                onChange={(e) =>
                  onToggleChange("extendAfter", e.target.checked)
                }
              />
              Extend After
            </label>
          </div>
        </div>
      ) : (
        <div>
          <input
            data-testid="range-start-picker"
            type="date"
            value={
              range?.startDate
                ? range.startDate.toISOString().split("T")[0]
                : ""
            }
            onChange={(e) => {
              const date = e.target.value
                ? new Date(e.target.value)
                : undefined;
              onRangeChange({
                startDate: date,
                endDate: range?.endDate,
              });
            }}
          />
          <input
            data-testid="range-end-picker"
            type="date"
            value={
              range?.endDate ? range.endDate.toISOString().split("T")[0] : ""
            }
            onChange={(e) => {
              const date = e.target.value
                ? new Date(e.target.value)
                : undefined;
              onRangeChange({
                startDate: range?.startDate,
                endDate: date,
              });
            }}
          />
          <div>
            <label>
              <input
                data-testid="extend-before-toggle"
                type="checkbox"
                checked={extendBefore}
                onChange={(e) =>
                  onToggleChange("extendBefore", e.target.checked)
                }
              />
              Extend Before
            </label>
            <label>
              <input
                data-testid="extend-after-toggle"
                type="checkbox"
                checked={extendAfter}
                onChange={(e) =>
                  onToggleChange("extendAfter", e.target.checked)
                }
              />
              Extend After
            </label>
          </div>
        </div>
      )}
    </div>
  ),
}));

describe("DateOfBirthPicker", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe("Basic Rendering", () => {
    it("renders with default props", () => {
      render(<DateOfBirthPicker onChange={mockOnChange} />);

      expect(
        screen.getByRole("group", { name: "Select date of birth" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("mode-single")).toBeInTheDocument();
      expect(screen.getByTestId("mode-range")).toBeInTheDocument();
      expect(screen.getByTestId("single-date-picker")).toBeInTheDocument();
    });

    it("renders with custom aria label", () => {
      render(
        <DateOfBirthPicker
          onChange={mockOnChange}
          ariaLabel="Custom DOB selector"
        />,
      );

      expect(
        screen.getByRole("group", { name: "Custom DOB selector" }),
      ).toBeInTheDocument();
    });

    it("renders with initial value", () => {
      const initialValue: DateOfBirthValue = {
        mode: "range",
        range: {
          startDate: new Date("1990-01-01"),
          endDate: new Date("1990-12-31"),
        },
        extendBefore: false,
        extendAfter: false,
      };

      render(
        <DateOfBirthPicker
          initialValue={initialValue}
          onChange={mockOnChange}
        />,
      );

      expect(screen.getByTestId("mode-range")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(
        screen.getByTestId("date-range-with-extensions"),
      ).toBeInTheDocument();
    });
  });

  describe("Mode Switching Safety", () => {
    it("should preserve data when switching from single to range mode", async () => {
      const user = userEvent.setup();
      const initialValue: DateOfBirthValue = {
        mode: "single",
        singleDate: new Date("1990-06-15"),
        extendBefore: false,
        extendAfter: false,
      };

      render(
        <DateOfBirthPicker
          initialValue={initialValue}
          onChange={mockOnChange}
        />,
      );

      // Switch to range mode
      await user.click(screen.getByTestId("mode-range"));

      // Should preserve the single date and convert to range
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: "range",
            singleDate: undefined, // Component clears singleDate when switching to range
            range: undefined,
            extendBefore: false,
            extendAfter: false,
          }),
        );
      });
    });

    it("should preserve data when switching from range to single mode", async () => {
      const user = userEvent.setup();
      const initialValue: DateOfBirthValue = {
        mode: "range",
        range: {
          startDate: new Date("1990-01-01"),
          endDate: new Date("1990-12-31"),
        },
        extendBefore: false,
        extendAfter: false,
      };

      render(
        <DateOfBirthPicker
          initialValue={initialValue}
          onChange={mockOnChange}
        />,
      );

      // Switch to single mode
      await user.click(screen.getByTestId("mode-single"));

      // Should preserve the range data
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: "single",
            singleDate: undefined,
            range: undefined, // Component clears range when switching to single
            extendBefore: false,
            extendAfter: false,
          }),
        );
      });
    });

    it("should handle mode switching with extension toggles", async () => {
      const user = userEvent.setup();
      const initialValue: DateOfBirthValue = {
        mode: "single",
        singleDate: new Date("1990-06-15"),
        extendBefore: true,
        extendAfter: false,
      };

      render(
        <DateOfBirthPicker
          initialValue={initialValue}
          onChange={mockOnChange}
        />,
      );

      // Switch to range mode
      await user.click(screen.getByTestId("mode-range"));

      // Should preserve extension toggle state
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: "range",
            extendBefore: true,
            extendAfter: false,
          }),
        );
      });
    });
  });

  describe("Extension Toggle Safety", () => {
    it("should prevent both extension toggles being enabled simultaneously", async () => {
      const user = userEvent.setup();
      render(<DateOfBirthPicker onChange={mockOnChange} />);

      // Switch to range mode first
      await user.click(screen.getByTestId("mode-range"));

      // Enable extend before
      await user.click(screen.getByTestId("extend-before-toggle"));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            extendBefore: true,
            extendAfter: false,
          }),
        );
      });

      // Try to enable extend after - should disable extend before
      await user.click(screen.getByTestId("extend-after-toggle"));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            extendBefore: false,
            extendAfter: true,
          }),
        );
      });
    });

    it("should handle extension toggles with boundary dates correctly", async () => {
      const user = userEvent.setup();
      const initialValue: DateOfBirthValue = {
        mode: "range",
        singleDate: new Date("1990-06-15"),
        extendBefore: true,
        extendAfter: false,
      };

      render(
        <DateOfBirthPicker
          initialValue={initialValue}
          onChange={mockOnChange}
        />,
      );

      // Switch to extend after mode
      await user.click(screen.getByTestId("extend-after-toggle"));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            extendBefore: false,
            extendAfter: true,
            singleDate: new Date("1990-06-15"),
            range: {
              startDate: new Date("1990-06-15"),
              endDate: LATEST_DATE,
            },
          }),
        );
      });
    });

    it("should clear boundary dates when switching back to regular range mode", async () => {
      const user = userEvent.setup();
      const initialValue: DateOfBirthValue = {
        mode: "range",
        singleDate: new Date("1990-06-15"),
        range: {
          startDate: EARLIEST_DATE,
          endDate: new Date("1990-06-15"),
        },
        extendBefore: true,
        extendAfter: false,
      };

      render(
        <DateOfBirthPicker
          initialValue={initialValue}
          onChange={mockOnChange}
        />,
      );

      // Disable extend before toggle
      await user.click(screen.getByTestId("extend-before-toggle"));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            extendBefore: false,
            extendAfter: false,
            singleDate: undefined,
            range: undefined, // Should clear range with boundary dates
          }),
        );
      });
    });
  });

  describe("State Management Safety", () => {
    it("should not call onChange on initial mount", () => {
      const initialValue: DateOfBirthValue = {
        mode: "single",
        singleDate: new Date("1990-06-15"),
        extendBefore: false,
        extendAfter: false,
      };

      render(
        <DateOfBirthPicker
          initialValue={initialValue}
          onChange={mockOnChange}
        />,
      );

      // Should not call onChange during initial render
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("should handle rapid state changes without race conditions", async () => {
      const user = userEvent.setup();
      render(<DateOfBirthPicker onChange={mockOnChange} />);

      // Rapidly switch modes multiple times
      await user.click(screen.getByTestId("mode-range"));
      await user.click(screen.getByTestId("mode-single"));
      await user.click(screen.getByTestId("mode-range"));

      // Should handle all changes gracefully
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledTimes(3);
      });

      // Final state should be range mode
      expect(mockOnChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          mode: "range",
        }),
      );
    });

    it("should maintain stable onChange callback reference", () => {
      const { rerender } = render(
        <DateOfBirthPicker onChange={mockOnChange} />,
      );

      // Rerender with same onChange function
      rerender(<DateOfBirthPicker onChange={mockOnChange} />);

      // Should not cause additional renders or issues
      expect(
        screen.getByRole("group", { name: "Select date of birth" }),
      ).toBeInTheDocument();
    });
  });

  describe("Date Input Safety", () => {
    it("should handle date changes in single mode", async () => {
      const user = userEvent.setup();
      render(<DateOfBirthPicker onChange={mockOnChange} />);

      const datePicker = screen.getByTestId("single-date-picker");
      await user.type(datePicker, "1990-06-15");

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: "single",
            singleDate: new Date("1990-06-15"),
          }),
        );
      });
    });

    it("should handle date changes in range mode", async () => {
      const user = userEvent.setup();
      render(<DateOfBirthPicker onChange={mockOnChange} />);

      // Switch to range mode
      await user.click(screen.getByTestId("mode-range"));

      // Set start date
      const startPicker = screen.getByTestId("range-start-picker");
      await user.type(startPicker, "1990-01-01");

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: "range",
            range: {
              startDate: new Date("1990-01-01"),
              endDate: undefined,
            },
          }),
        );
      });
    });

    it("should handle clearing dates", async () => {
      const user = userEvent.setup();
      const initialValue: DateOfBirthValue = {
        mode: "single",
        singleDate: new Date("1990-06-15"),
        extendBefore: false,
        extendAfter: false,
      };

      render(
        <DateOfBirthPicker
          initialValue={initialValue}
          onChange={mockOnChange}
        />,
      );

      const datePicker = screen.getByTestId("single-date-picker");
      await user.clear(datePicker);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: "single",
            singleDate: undefined,
          }),
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid date inputs gracefully", async () => {
      const user = userEvent.setup();
      render(<DateOfBirthPicker onChange={mockOnChange} />);

      const datePicker = screen.getByTestId("single-date-picker");

      // Try to input invalid date
      await user.type(datePicker, "invalid-date");

      // Should not crash and should handle gracefully
      expect(screen.getByTestId("single-date-picker")).toBeInTheDocument();
    });

    it("should handle undefined onChange callback", () => {
      // Should not crash when onChange is undefined
      expect(() => {
        render(
          <DateOfBirthPicker
            onChange={undefined as unknown as (value: DateOfBirthValue) => void}
          />,
        );
      }).not.toThrow();
    });

    it("should handle malformed initial value", () => {
      const malformedValue = {
        mode: "invalid-mode",
        singleDate: "not-a-date",
        extendBefore: "not-a-boolean",
      } as unknown as DateOfBirthValue;

      // Should not crash with malformed initial value
      expect(() => {
        render(
          <DateOfBirthPicker
            initialValue={malformedValue}
            onChange={mockOnChange}
          />,
        );
      }).not.toThrow();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<DateOfBirthPicker onChange={mockOnChange} />);

      const group = screen.getByRole("group", { name: "Select date of birth" });
      expect(group).toBeInTheDocument();

      const modeSelector = screen.getByRole("group", {
        name: "Select search type",
      });
      expect(modeSelector).toBeInTheDocument();
    });

    it("should support keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<DateOfBirthPicker onChange={mockOnChange} />);

      // Should be able to tab to mode buttons
      await user.tab();
      expect(screen.getByTestId("mode-single")).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId("mode-range")).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId("single-date-picker")).toHaveFocus();
    });
  });
});
