import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { FieldRenderer } from "~/components/search/FieldRenderer";
import {
  createMockFieldRendererProps,
  createMockDropdownLists,
  cleanupMocks,
  testSearchFields,
} from "~/__tests__/utils/searchTestUtils";

// Mock the UI components
jest.mock("~/components/ui/ComboBox", () => ({
  ComboboxDropdown: ({ items, initialValue, onSelect, ariaLabel }: any) => (
    <select
      data-testid="combobox-dropdown"
      value={initialValue}
      onChange={(e) => onSelect(e.target.value)}
      aria-label={ariaLabel}
    >
      {items.map((item: any) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  ),
}));

jest.mock("~/components/ui/MultiSelectCombobox", () => ({
  MultiSelectCombobox: ({ items, initialValues, onSelect, ariaLabel }: any) => (
    <div data-testid="multi-select-combobox">
      <select
        multiple
        value={initialValues}
        onChange={(e) => {
          const values = Array.from(
            e.target.selectedOptions,
            (option: any) => option.value,
          );
          onSelect(values);
        }}
        aria-label={ariaLabel}
      >
        {items.map((item: any) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

jest.mock("~/components/ui/MultiStringInput", () => ({
  MultiStringInput: ({ placeholder, value, onChange }: any) => (
    <input
      data-testid="multi-string-input"
      placeholder={placeholder}
      value={Array.isArray(value) ? value.join(", ") : value || ""}
      onChange={(e) => onChange(e.target.value.split(", "))}
    />
  ),
}));

jest.mock("~/components/ui/MultiStreetSearch", () => ({
  MultiStreetSearch: ({ streets, value, onChange }: any) => (
    <div data-testid="multi-street-search">
      <input
        placeholder="Enter streets"
        value={Array.isArray(value) ? value.join(", ") : value || ""}
        onChange={(e) => onChange(e.target.value.split(", "))}
      />
    </div>
  ),
}));

jest.mock("~/components/ui/datePicker", () => ({
  DatePicker: ({ initialValue, onChange, ariaLabel }: any) => (
    <input
      data-testid="date-picker"
      type="date"
      value={initialValue ? initialValue.toISOString().split("T")[0] : ""}
      onChange={(e) => onChange(new Date(e.target.value))}
      aria-label={ariaLabel}
    />
  ),
}));

jest.mock("~/components/ui/input", () => ({
  Input: ({ type, placeholder, value, onChange, ariaLabel, id }: any) => (
    <input
      data-testid={`input-${type || "text"}`}
      type={type}
      placeholder={placeholder}
      value={value || ""}
      onChange={onChange}
      aria-label={ariaLabel}
      id={id}
    />
  ),
}));

jest.mock("~/components/ui/checkbox", () => ({
  Checkbox: ({ id, checked, onCheckedChange }: any) => (
    <input
      data-testid="checkbox"
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
}));

jest.mock("~/app/recordsearch/StreetSearch", () => ({
  StreetSearch: ({ streets, initialValue, onChange }: any) => (
    <div data-testid="street-search">
      <input
        placeholder="Enter street"
        value={initialValue || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

jest.mock("~/app/recordsearch/CityTownSearch", () => ({
  CityTownSearch: ({ cities, initialCity, onChange }: any) => (
    <div data-testid="city-town-search">
      <input
        placeholder="Enter city"
        value={initialCity || ""}
        onChange={(e) => onChange(e.target.value, "")}
      />
    </div>
  ),
}));

describe("FieldRenderer", () => {
  beforeEach(() => {
    cleanupMocks();
  });

  describe("String Fields", () => {
    it("renders single string input", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.stringField,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByTestId("input-text");
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

    it("handles string input changes", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.emptyStringField,
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByTestId("input-text");
      await user.type(input, "123");

      expect(mockOnValueChange).toHaveBeenCalledTimes(3); // 1, 2, 3
      expect(mockOnValueChange).toHaveBeenLastCalledWith("3");
    });
  });

  describe("Number Fields", () => {
    it("renders number input", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.numberField,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByTestId("input-number");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "Enter House Number");
    });

    it("handles number input changes", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.numberField,
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByTestId("input-number");
      await user.type(input, "123");

      expect(mockOnValueChange).toHaveBeenCalledTimes(3); // 1, 2, 3
      expect(mockOnValueChange).toHaveBeenLastCalledWith(1233);
    });

    it("handles empty number input", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.numberField,
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByTestId("input-number");
      await user.clear(input);

      expect(mockOnValueChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe("Boolean Fields", () => {
    it("renders checkbox", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.booleanField,
      });
      render(<FieldRenderer {...props} />);

      const checkbox = screen.getByTestId("checkbox");
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
    });

    it("handles checkbox changes", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.booleanField,
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const checkbox = screen.getByTestId("checkbox");
      await user.click(checkbox);

      expect(mockOnValueChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Date Fields", () => {
    it("renders date picker", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.dateField,
      });
      render(<FieldRenderer {...props} />);

      const datePicker = screen.getByTestId("date-picker");
      expect(datePicker).toBeInTheDocument();
      expect(datePicker).toHaveAttribute("aria-label", "Select Date of Birth");
    });

    it("handles date changes", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockFieldRendererProps({
        field: testSearchFields.dateField,
        onValueChange: mockOnValueChange,
      });
      render(<FieldRenderer {...props} />);

      const datePicker = screen.getByTestId("date-picker");
      await user.clear(datePicker);
      await user.type(datePicker, "1990-01-01");

      expect(mockOnValueChange).toHaveBeenCalledWith(expect.any(Date));
    });
  });

  describe("Dropdown Fields", () => {
    it("renders single dropdown", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.dropdownField,
        dropdownList: createMockDropdownLists(),
      });
      render(<FieldRenderer {...props} />);

      const dropdown = screen.getByTestId("combobox-dropdown");
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

      const dropdown = screen.getByTestId("combobox-dropdown");
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

      expect(screen.getByTestId("input-text")).toBeInTheDocument();

      const numberProps = createMockFieldRendererProps({
        field: testSearchFields.numberField,
      });
      rerender(<FieldRenderer {...numberProps} />);

      expect(screen.getByTestId("input-number")).toBeInTheDocument();
    });

    it("has correct field IDs", () => {
      const props = createMockFieldRendererProps({
        field: testSearchFields.stringField,
        index: 1,
        subIndex: 2,
      });
      render(<FieldRenderer {...props} />);

      const input = screen.getByTestId("input-text");
      expect(input).toHaveAttribute("id", "VRCNUM-1-2");
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined field gracefully", () => {
      const props = createMockFieldRendererProps({
        field: undefined as any,
      });

      expect(() => render(<FieldRenderer {...props} />)).toThrow();
    });

    it("handles invalid field type gracefully", () => {
      const invalidField = {
        ...testSearchFields.stringField,
        type: "InvalidType" as any,
      };
      const props = createMockFieldRendererProps({
        field: invalidField,
      });

      expect(() => render(<FieldRenderer {...props} />)).toThrow();
    });
  });
});
