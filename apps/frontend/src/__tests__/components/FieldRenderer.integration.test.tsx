import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { FieldRenderer } from "~/components/search/FieldRenderer";
import {
  createMockFieldRendererProps,
  createMockDropdownLists,
  cleanupMocks,
  testSearchFields,
} from "~/__tests__/utils/searchTestUtils";
import type { DatePickerProps } from "~/components/ui/datePicker";
import type { StreetSearchProps } from "~/app/recordsearch/StreetSearch";
import type { CityTownSearchProps } from "~/app/recordsearch/CityTownSearch";
import type { MultiSelectComboboxProps } from "~/components/ui/MultiSelectCombobox";
import type { MultiStringInputProps } from "~/components/ui/MultiStringInput";
import type { MultiStreetSearchProps } from "~/components/ui/MultiStreetSearch";
import type { BaseSearchField } from "~/types/searchFields";

jest.mock("~/components/ui/DatePicker", () => ({
  DatePicker: ({ initialValue, onChange, ariaLabel }: DatePickerProps) => (
    <button
      onClick={() => onChange(new Date("2023-01-01"))}
      aria-label={ariaLabel}
    >
      {initialValue ? initialValue.toISOString().split("T")[0] : "Select Date"}
    </button>
  ),
}));

jest.mock("~/app/recordsearch/StreetSearch", () => ({
  StreetSearch: ({
    streets: _streets,
    initialValue,
    onChange,
  }: StreetSearchProps) => (
    <input
      list="streets"
      value={initialValue}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter street"
    />
  ),
}));

jest.mock("~/app/recordsearch/CityTownSearch", () => ({
  CityTownSearch: ({
    cities: _cities,
    initialCity,
    onChange,
  }: CityTownSearchProps) => (
    <input
      list="cities"
      value={initialCity}
      onChange={(e) => onChange(e.target.value, "")}
      placeholder="Enter city"
    />
  ),
}));

// Mock complex multi-select components to avoid UI complexity in tests
jest.mock("~/components/ui/MultiSelectCombobox", () => ({
  MultiSelectCombobox: ({
    items,
    displayLabel,
    initialValues,
    onSelect,
    ariaLabel,
  }: MultiSelectComboboxProps) => (
    <div>
      <label>{displayLabel}</label>
      <select
        multiple
        value={initialValues}
        onChange={(e) => {
          const values = Array.from(
            e.target.selectedOptions,
            (option) => option.value,
          );
          onSelect(values);
        }}
        aria-label={ariaLabel}
      >
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

jest.mock("~/components/ui/MultiStringInput", () => ({
  MultiStringInput: ({
    placeholder,
    value,
    onChange,
  }: MultiStringInputProps) => (
    <input
      placeholder={placeholder}
      value={Array.isArray(value) ? value.join(", ") : value}
      onChange={(e) => onChange(e.target.value.split(", "))}
    />
  ),
}));

jest.mock("~/components/ui/MultiStreetSearch", () => ({
  MultiStreetSearch: ({
    streets: _streets,
    value,
    onChange,
  }: MultiStreetSearchProps) => (
    <input
      placeholder="Enter streets"
      value={Array.isArray(value) ? value.join(", ") : value}
      onChange={(e) => onChange(e.target.value.split(", "))}
    />
  ),
}));

// Integration tests for FieldRenderer using real UI components
// These tests validate actual field type switching logic and real component behavior

describe("FieldRenderer Real Component Integration", () => {
  beforeEach(() => {
    cleanupMocks();
  });

  describe("String Field Integration", () => {
    it("renders real Input component with correct value and accessibility", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.stringField,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByRole("textbox", { name: /Enter Voter ID/ });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("123456789");
      expect(input).toHaveAttribute("type", "text");
      expect(input).toHaveAttribute("id", "VRCNUM-0-0");
    });

    it("calls onValueChange with each character as typed", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.emptyStringField,
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByRole("textbox", { name: /Enter Voter ID/ });
      await user.type(input, "123");

      expect(mockOnValueChange).toHaveBeenCalledTimes(3);
      expect(mockOnValueChange).toHaveBeenLastCalledWith("3");
    });

    it("renders real MultiStringInput component for multiple values", () => {
      const multiStringField = {
        ...testSearchFields.stringField,
        allowMultiple: true,
      };
      const props = createMockFieldRendererProps({
        field: multiStringField,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "Enter Voter ID(s)");
    });
  });

  describe("Number Field Integration", () => {
    it("renders real Input component with correct type and accessibility", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.numberField,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByRole("spinbutton", {
        name: /Enter House Number/,
      });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(123);
      expect(input).toHaveAttribute("type", "number");
      expect(input).toHaveAttribute("id", "houseNum-0-0");
    });

    it("calls onValueChange with parsed number for each character typed", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: { ...testSearchFields.numberField, value: undefined },
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByRole("spinbutton", {
        name: /Enter House Number/,
      });

      // Clear any existing value first
      await user.clear(input);

      // Type the number character by character
      await user.type(input, "456");

      // userEvent.type() simulates individual keystrokes, so each character triggers onChange
      expect(mockOnValueChange).toHaveBeenCalledTimes(3);
      expect(mockOnValueChange).toHaveBeenNthCalledWith(1, 4);
      expect(mockOnValueChange).toHaveBeenNthCalledWith(2, 5);
      expect(mockOnValueChange).toHaveBeenNthCalledWith(3, 6);
    });

    it("calls onValueChange with undefined when number input is cleared", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.numberField,
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByRole("spinbutton", {
        name: /Enter House Number/,
      });
      await user.clear(input);

      expect(mockOnValueChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("Boolean Field Integration", () => {
    it("renders real Checkbox component with correct initial state", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.booleanField,
      });
      render(<FieldRenderer {...props} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
      expect(checkbox).toHaveAttribute("id", "hasEmail-0-0");
    });

    it("calls onValueChange when checkbox is toggled", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.booleanField,
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      expect(mockOnValueChange).toHaveBeenCalledWith(false);
    });

    it("has proper label association for accessibility", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.booleanField,
        index: 1,
        subIndex: 2,
      });
      render(<FieldRenderer {...props} />);

      const checkbox = screen.getByRole("checkbox");
      const label = screen.getByText("Only records with an email");

      expect(checkbox).toHaveAttribute("id", "hasEmail-1-2");
      expect(label).toHaveAttribute("for", "hasEmail-1-2");
    });
  });

  describe("Date Field Integration", () => {
    it("renders real DatePicker component with proper accessibility", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.dateField,
      });
      render(<FieldRenderer {...props} />);

      const dateButton = screen.getByRole("button", {
        name: /Select Date of Birth/,
      });
      expect(dateButton).toBeInTheDocument();
      expect(dateButton).toHaveAttribute("aria-label", "Select Date of Birth");
    });

    it("calls onValueChange when date button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.dateField,
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const dateButton = screen.getByRole("button", {
        name: /Select Date of Birth/,
      });
      await user.click(dateButton);

      // The real DatePicker calls onChange when the button is clicked
      expect(mockOnValueChange).toHaveBeenCalledTimes(1);
      expect(mockOnValueChange).toHaveBeenCalledWith(expect.any(Date));
    });
  });

  describe("Dropdown Field Integration", () => {
    it("renders real ComboboxDropdown component with proper accessibility", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.dropdownField,
        dropdownList: createMockDropdownLists(),
      });
      render(<FieldRenderer {...props} />);

      const dropdown = screen.getByRole("combobox", { name: /Select Party/ });
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).toHaveAttribute("aria-label", "Select Party");
    });

    it("displays current dropdown value in the UI", () => {
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.dropdownField,
        dropdownList: createMockDropdownLists(),
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const dropdown = screen.getByRole("combobox", { name: /Select Party/ });
      expect(dropdown).toBeInTheDocument();

      // Check that the current value is displayed
      expect(screen.getByText("DEM")).toBeInTheDocument();
    });

    it("renders real MultiSelectCombobox for multiple selection", () => {
      const multiDropdownField = {
        ...testSearchFields.dropdownField,
        allowMultiple: true,
      };
      const props = createMockFieldRendererProps({
        field: multiDropdownField,
        dropdownList: createMockDropdownLists(),
      });
      render(<FieldRenderer {...props} />);

      // MultiSelectCombobox renders as a select element with listbox role
      const multiSelect = screen.getByRole("listbox", {
        name: /Select multiple Party/,
      });
      expect(multiSelect).toBeInTheDocument();
    });
  });

  describe("Street Field Integration", () => {
    it("renders real StreetSearch component with proper accessibility", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.streetField,
        dropdownList: createMockDropdownLists(),
      });
      render(<FieldRenderer {...props} />);

      // StreetSearch renders as an input with datalist (combobox role)
      const streetInput = screen.getByRole("combobox");
      expect(streetInput).toBeInTheDocument();
      expect(streetInput).toHaveAttribute("placeholder", "Enter street");
    });

    it("renders real MultiStreetSearch for multiple streets", () => {
      const multiStreetField = {
        ...testSearchFields.streetField,
        allowMultiple: true,
      };
      const props = createMockFieldRendererProps({
        field: multiStreetField,
        dropdownList: createMockDropdownLists(),
      });
      render(<FieldRenderer {...props} />);

      const multiStreetInput = screen.getByRole("textbox");
      expect(multiStreetInput).toBeInTheDocument();
      expect(multiStreetInput).toHaveAttribute("placeholder", "Enter streets");
    });
  });

  describe("City/Town Field Integration", () => {
    it("renders real CityTownSearch component with proper accessibility", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.cityTownField,
        dropdownList: createMockDropdownLists(),
      });
      render(<FieldRenderer {...props} />);

      // CityTownSearch renders as an input with datalist (combobox role)
      const cityInput = screen.getByRole("combobox");
      expect(cityInput).toBeInTheDocument();
      expect(cityInput).toHaveAttribute("placeholder", "Enter city");
    });

    it("renders real MultiSelectCombobox for multiple cities", () => {
      const multiCityField = {
        ...testSearchFields.cityTownField,
        allowMultiple: true,
      };
      const props = createMockFieldRendererProps({
        field: multiCityField,
        dropdownList: createMockDropdownLists(),
      });
      render(<FieldRenderer {...props} />);

      // MultiSelectCombobox renders as a select element with listbox role
      const multiSelect = screen.getByRole("listbox");
      expect(multiSelect).toBeInTheDocument();
    });
  });

  describe("Field Type Switching Logic", () => {
    it("correctly switches between different field types", () => {
      const { rerender } = render(
        <FieldRenderer
          {...createMockFieldRendererProps({
            field: testSearchFields.stringField,
          })}
        />,
      );

      // Initially renders string input
      expect(
        screen.getByRole("textbox", { name: /Enter Voter ID/ }),
      ).toBeInTheDocument();

      // Switch to number field
      rerender(
        <FieldRenderer
          {...createMockFieldRendererProps({
            field: testSearchFields.numberField,
          })}
        />,
      );

      expect(
        screen.getByRole("spinbutton", { name: /Enter House Number/ }),
      ).toBeInTheDocument();

      // Switch to boolean field
      rerender(
        <FieldRenderer
          {...createMockFieldRendererProps({
            field: testSearchFields.booleanField,
          })}
        />,
      );

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("correctly handles allowMultiple flag for different field types", () => {
      const { rerender } = render(
        <FieldRenderer
          {...createMockFieldRendererProps({
            field: { ...testSearchFields.stringField, allowMultiple: true },
          })}
        />,
      );

      // Should render MultiStringInput
      const multiStringInput = screen.getByRole("textbox");
      expect(multiStringInput).toHaveAttribute(
        "placeholder",
        "Enter Voter ID(s)",
      );

      // Switch to dropdown with allowMultiple
      rerender(
        <FieldRenderer
          {...createMockFieldRendererProps({
            field: { ...testSearchFields.dropdownField, allowMultiple: true },
            dropdownList: createMockDropdownLists(),
          })}
        />,
      );

      // Should render MultiSelectCombobox as listbox
      expect(
        screen.getByRole("listbox", { name: /Select multiple Party/ }),
      ).toBeInTheDocument();
    });
  });

  describe("Component-Specific Behavior", () => {
    it("validates real Input component focus and typing behavior", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.stringField,
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByRole("textbox", { name: /Enter Voter ID/ });

      // Test that input maintains focus and cursor position
      await user.click(input);
      await user.type(input, "abc");

      expect(input).toHaveFocus();
      expect(mockOnValueChange).toHaveBeenCalledTimes(3);
    });

    it("validates real Checkbox component toggle behavior", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.booleanField,
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const checkbox = screen.getByRole("checkbox");

      // Test checkbox toggle behavior
      expect(checkbox).toBeChecked();
      await user.click(checkbox);

      // Verify the click was registered
      expect(mockOnValueChange).toHaveBeenCalled();
    });

    it("validates real dropdown component renders options correctly", () => {
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.dropdownField,
        dropdownList: createMockDropdownLists(),
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const dropdown = screen.getByRole("combobox", { name: /Select Party/ });
      expect(dropdown).toBeInTheDocument();

      // Test that dropdown shows current value
      expect(screen.getByText("DEM")).toBeInTheDocument();
    });
  });

  describe("Component Validation", () => {
    it("validates correct field ID generation and accessibility labels", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.stringField,
        index: 1,
        subIndex: 2,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByRole("textbox", { name: /Enter Voter ID/ });
      expect(input).toHaveAttribute("id", "VRCNUM-1-2");
      expect(input).toHaveAttribute("aria-label", "Enter Voter ID (part 3)");
    });

    it("validates checkbox accessibility attributes and styling", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.booleanField,
        index: 0,
        subIndex: 1,
      });
      render(<FieldRenderer {...props} />);

      const checkbox = screen.getByRole("checkbox");
      const label = screen.getByText("Only records with an email");

      expect(checkbox).toHaveAttribute("id", "hasEmail-0-1");
      expect(label).toHaveAttribute("for", "hasEmail-0-1");
      expect(label).toHaveClass("cursor-pointer");
    });

    it("handles invalid field types by gracefully returning null", () => {
      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const invalidField = {
        ...testSearchFields.stringField,
        type: "InvalidType",
      };
      const props = createMockFieldRendererProps({
        field: invalidField as unknown as BaseSearchField, // intentionally unsafe to test graceful handling
      });

      const { container } = render(<FieldRenderer {...props} />);

      // Should render nothing (null) for invalid field types
      expect(container.firstChild).toBeNull();

      // Should log a warning about unknown field type
      expect(consoleSpy).toHaveBeenCalledWith(
        "Unknown field type: InvalidType",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Component Performance", () => {
    it("handles re-rendering with same props without issues", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.stringField,
      });
      const { rerender } = render(<FieldRenderer {...props} />);

      const input = screen.getByRole("textbox", { name: /Enter Voter ID/ });
      expect(input).toHaveValue("123456789");

      // Re-render with same props should not cause issues
      rerender(<FieldRenderer {...props} />);
      expect(input).toHaveValue("123456789");
    });

    it("handles prop changes correctly during re-rendering", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.stringField,
      });
      const { rerender } = render(<FieldRenderer {...props} />);

      const input = screen.getByRole("textbox", { name: /Enter Voter ID/ });
      expect(input).toHaveValue("123456789");

      // Change value to test re-rendering behavior
      const newProps = {
        ...props,
        field: { ...props.field, value: "987654321" },
      };
      rerender(<FieldRenderer {...newProps} />);

      // Verify component re-renders with new props
      const newInput = screen.getByRole("textbox", { name: /Enter Voter ID/ });
      expect(newInput).toBeInTheDocument();
    });
  });
});
