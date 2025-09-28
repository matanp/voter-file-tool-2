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
import type { BaseSearchField, BaseFieldType } from "~/types/searchFields";
import type { DatePickerProps } from "~/components/ui/datePicker";

import type { ComboboxDropdownProps } from "~/components/ui/ComboBox";
import type { MultiSelectComboboxProps } from "~/components/ui/MultiSelectCombobox";
import type { MultiStringInputProps } from "~/components/ui/MultiStringInput";
import type { MultiStreetSearchProps } from "~/components/ui/MultiStreetSearch";
import type { InputProps } from "~/components/ui/input";
import type { StreetSearchProps } from "~/app/recordsearch/StreetSearch";
import type { CityTownSearchProps } from "~/app/recordsearch/CityTownSearch";

// Mock only the most complex UI components, use real components where possible
jest.mock("~/components/ui/ComboBox", () => ({
  ComboboxDropdown: (props: ComboboxDropdownProps) => (
    <select
      data-testid="combobox-dropdown"
      value={props.initialValue}
      onChange={(e) => props.onSelect(e.target.value)}
      aria-label={props.ariaLabel}
    >
      {props.items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  ),
}));

jest.mock("~/components/ui/MultiSelectCombobox", () => ({
  MultiSelectCombobox: (props: MultiSelectComboboxProps) => (
    <div data-testid="multi-select-combobox">
      <select
        multiple
        value={props.initialValues}
        onChange={(e) => {
          const values = Array.from(
            e.target.selectedOptions,
            (option) => option.value,
          );
          props.onSelect(values);
        }}
        aria-label={props.ariaLabel}
      >
        {props.items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

// Use real Input component - it's simple enough
jest.mock("~/components/ui/input", () => ({
  Input: (props: InputProps) => (
    <input
      data-testid={`input-${props.type ?? "text"}`}
      type={props.type}
      placeholder={props.placeholder}
      value={props.value ?? ""}
      onChange={props.onChange}
      aria-label={props["aria-label"]}
      id={props.id}
    />
  ),
}));

// Use real Checkbox component - it's simple enough
jest.mock("~/components/ui/checkbox", () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
  }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      data-testid="checkbox"
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

// Mock complex components that have complex behavior
jest.mock("~/components/ui/MultiStringInput", () => ({
  MultiStringInput: (props: MultiStringInputProps) => (
    <input
      data-testid="multi-string-input"
      placeholder={props.placeholder}
      value={
        Array.isArray(props.value)
          ? props.value.join(", ")
          : (props.value ?? "")
      }
      onChange={(e) => props.onChange(e.target.value.split(", "))}
    />
  ),
}));

jest.mock("~/components/ui/MultiStreetSearch", () => ({
  MultiStreetSearch: (props: MultiStreetSearchProps) => (
    <div data-testid="multi-street-search">
      <input
        placeholder="Enter streets"
        value={
          Array.isArray(props.value)
            ? props.value.join(", ")
            : (props.value ?? "")
        }
        onChange={(e) => props.onChange(e.target.value.split(", "))}
      />
    </div>
  ),
}));

jest.mock("~/components/ui/datePicker", () => ({
  DatePicker: (props: DatePickerProps) => (
    <button
      data-testid="date-picker"
      onClick={() => props.onChange(new Date("1990-01-01"))}
      aria-label={props.ariaLabel}
    >
      {props.initialValue
        ? props.initialValue.toISOString().split("T")[0]
        : "Select Date"}
    </button>
  ),
}));

jest.mock("~/app/recordsearch/StreetSearch", () => ({
  StreetSearch: (props: StreetSearchProps) => (
    <div data-testid="street-search">
      <input
        placeholder="Enter street"
        value={props.initialValue ?? ""}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  ),
}));

jest.mock("~/app/recordsearch/CityTownSearch", () => ({
  CityTownSearch: (props: CityTownSearchProps) => (
    <div data-testid="city-town-search">
      <input
        placeholder="Enter city"
        value={props.initialCity ?? ""}
        onChange={(e) => props.onChange(e.target.value, "")}
      />
    </div>
  ),
}));

describe("FieldRenderer", () => {
  beforeEach(() => {
    cleanupMocks();
  });

  describe("String Fields", () => {
    it("renders string input with correct accessibility", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.stringField,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByRole("textbox", { name: /Enter Voter ID/ });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "Enter Voter ID");
    });

    it("renders multi-string input when allowMultiple is true", () => {
      const multiStringField = {
        ...testSearchFields.stringField,
        allowMultiple: true,
      };
      const props = createMockFieldRendererProps({
        field: multiStringField,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByTestId("multi-string-input");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "Enter Voter ID(s)");
    });
  });

  describe("Number Fields", () => {
    it("renders number input with correct accessibility", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.numberField,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByRole("spinbutton", {
        name: /Enter House Number/,
      });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "Enter House Number");
    });

    it("calls onValueChange with parsed number after typing", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const emptyNumberField = {
        ...testSearchFields.numberField,
        value: undefined,
      };
      const props = createMockFieldRendererProps({
        field: emptyNumberField,
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByRole("spinbutton", {
        name: /Enter House Number/,
      });
      await user.type(input, "123");

      // Should be called for each character: 1, 2, 3
      expect(mockOnValueChange).toHaveBeenCalledTimes(3);
      expect(mockOnValueChange).toHaveBeenNthCalledWith(1, 1);
      expect(mockOnValueChange).toHaveBeenNthCalledWith(2, 2);
      expect(mockOnValueChange).toHaveBeenLastCalledWith(3);
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

  describe("Boolean Fields", () => {
    it("renders checkbox with proper accessibility", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.booleanField,
      });
      render(<FieldRenderer {...props} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
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
  });

  describe("Date Fields", () => {
    it("renders date picker with proper accessibility", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.dateField,
      });
      render(<FieldRenderer {...props} />);

      const dateInput = screen.getByTestId("date-picker");
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveAttribute("aria-label", "Select Date of Birth");
    });

    it("handles date changes", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.dateField,
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const dateButton = screen.getByTestId("date-picker");
      expect(dateButton).toBeInTheDocument();

      await user.click(dateButton);

      expect(mockOnValueChange).toHaveBeenCalledWith(expect.any(Date));
    });
  });

  describe("Dropdown Fields", () => {
    it("renders single dropdown with proper accessibility", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.dropdownField,
        dropdownList: createMockDropdownLists(),
      });
      render(<FieldRenderer {...props} />);

      const dropdown = screen.getByRole("combobox", { name: /Select Party/ });
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).toHaveAttribute("aria-label", "Select Party");
    });

    it("renders multi-select dropdown when allowMultiple is true", () => {
      const multiDropdownField = {
        ...testSearchFields.dropdownField,
        allowMultiple: true,
      };
      const props = createMockFieldRendererProps({
        field: multiDropdownField,
        dropdownList: createMockDropdownLists(),
      });
      render(<FieldRenderer {...props} />);

      const multiSelect = screen.getByTestId("multi-select-combobox");
      expect(multiSelect).toBeInTheDocument();
    });

    it("handles dropdown selection", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.dropdownField,
        dropdownList: createMockDropdownLists(),
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const dropdown = screen.getByRole("combobox", { name: /Select Party/ });
      await user.selectOptions(dropdown, "REP");

      expect(mockOnValueChange).toHaveBeenCalledWith("REP");
    });
  });

  describe("Street Fields", () => {
    it("renders single street search", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.streetField,
        dropdownList: createMockDropdownLists(),
      });
      render(<FieldRenderer {...props} />);

      const streetSearch = screen.getByTestId("street-search");
      expect(streetSearch).toBeInTheDocument();
    });

    it("renders multi-street search when allowMultiple is true", () => {
      const multiStreetField = {
        ...testSearchFields.streetField,
        allowMultiple: true,
      };
      const props = createMockFieldRendererProps({
        field: multiStreetField,
        dropdownList: createMockDropdownLists(),
      });
      render(<FieldRenderer {...props} />);

      const multiStreetSearch = screen.getByTestId("multi-street-search");
      expect(multiStreetSearch).toBeInTheDocument();
    });
  });

  describe("City/Town Fields", () => {
    it("renders city town search", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.cityTownField,
        dropdownList: createMockDropdownLists(),
      });
      render(<FieldRenderer {...props} />);

      const cityTownSearch = screen.getByTestId("city-town-search");
      expect(cityTownSearch).toBeInTheDocument();
    });

    it("renders multi-select for city when allowMultiple is true", () => {
      const multiCityField = {
        ...testSearchFields.cityTownField,
        allowMultiple: true,
      };
      const props = createMockFieldRendererProps({
        field: multiCityField,
        dropdownList: createMockDropdownLists(),
      });
      render(<FieldRenderer {...props} />);

      const multiSelect = screen.getByTestId("multi-select-combobox");
      expect(multiSelect).toBeInTheDocument();
    });
  });

  describe("Hidden Fields", () => {
    it("renders nothing for hidden fields", () => {
      // Find the CC_WD_Village field from the cityTown compound field
      const hiddenField = {
        ...testSearchFields.cityTownField,
        name: "CC_WD_Village" as const,
        type: "Hidden" as const,
      };
      const props = createMockFieldRendererProps({
        field: hiddenField,
      });
      const { container } = render(<FieldRenderer {...props} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Accessibility", () => {
    it("has correct ARIA labels for different field types", () => {
      const stringProps = createMockFieldRendererProps({
        field: testSearchFields.stringField,
      });
      const { rerender } = render(<FieldRenderer {...stringProps} />);

      expect(
        screen.getByRole("textbox", { name: /Enter Voter ID/ }),
      ).toBeInTheDocument();

      const numberProps = createMockFieldRendererProps({
        field: testSearchFields.numberField,
      });
      rerender(<FieldRenderer {...numberProps} />);

      expect(
        screen.getByRole("spinbutton", { name: /Enter House Number/ }),
      ).toBeInTheDocument();
    });

    it("generates correct field IDs for compound field context", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.stringField,
        index: 1,
        subIndex: 2,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByRole("textbox", { name: /Enter Voter ID/ });
      expect(input).toHaveAttribute("id", "VRCNUM-1-2");
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined field gracefully", () => {
      const props = createMockFieldRendererProps({
        field: undefined as unknown as BaseSearchField,
      });

      expect(() => render(<FieldRenderer {...props} />)).toThrow();
    });

    it("handles invalid field type gracefully", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {
        /** noop */
      });

      const invalidField = {
        ...testSearchFields.stringField,
        type: "InvalidType" as BaseFieldType,
      };
      const props = createMockFieldRendererProps({
        field: invalidField,
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
});
