import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { SearchRow } from "~/components/search/SearchRow";
import {
  createMockSearchRowProps,
  createMockDropdownLists,
  cleanupMocks,
} from "~/__tests__/utils/searchTestUtils";
import {
  mockSearchFields,
  mockCompoundFields,
} from "~/__tests__/utils/mockData";
import type { SearchField } from "~/types/searchFields";
import type { ComboboxDropdownProps } from "~/components/ui/ComboBox";

// Mock only complex external dependencies, use real components where possible
jest.mock("~/components/ui/ComboBox", () => ({
  ComboboxDropdown: (props: ComboboxDropdownProps) => (
    <select
      data-testid="field-selector"
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

// Mock the Button component
jest.mock("~/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

describe("SearchRow", () => {
  beforeEach(() => {
    cleanupMocks();
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      const props = createMockSearchRowProps();
      render(<SearchRow {...props} />);

      expect(
        screen.getByRole("group", { name: "Search criteria 1" }),
      ).toBeInTheDocument();
    });

    it("renders with correct accessibility attributes", () => {
      const props = createMockSearchRowProps();
      render(<SearchRow {...props} />);

      const group = screen.getByRole("group", { name: "Search criteria 1" });
      expect(group).toBeInTheDocument();

      const fieldSelector = screen.getByRole("combobox", {
        name: /Select search field for criteria 1/,
      });
      expect(fieldSelector).toHaveAttribute(
        "aria-label",
        "Select search field for criteria 1",
      );
    });

    it("renders field selector with correct options", () => {
      const props = createMockSearchRowProps({
        availableFields: [
          { label: "First Name", value: "firstName" },
          { label: "Last Name", value: "lastName" },
          { label: "Voter ID", value: "VRCNUM" },
        ],
      });
      render(<SearchRow {...props} />);

      const fieldSelector = screen.getByRole("combobox", {
        name: /Select search field for criteria 1/,
      });
      expect(fieldSelector).toBeInTheDocument();

      // Check that options are rendered
      expect(screen.getByText("First Name")).toBeInTheDocument();
      expect(screen.getByText("Last Name")).toBeInTheDocument();
      expect(screen.getByText("Voter ID")).toBeInTheDocument();
    });

    it("renders remove button when canRemove is true", () => {
      const props = createMockSearchRowProps({ canRemove: true });
      render(<SearchRow {...props} />);

      const removeButton = screen.getByRole("button", {
        name: "Remove search criteria 1",
      });
      expect(removeButton).toBeInTheDocument();
      expect(removeButton).not.toBeDisabled();
    });

    it("does not render remove button when canRemove is false", () => {
      const props = createMockSearchRowProps({ canRemove: false });
      render(<SearchRow {...props} />);

      expect(
        screen.queryByRole("button", { name: "Remove search criteria 1" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Field Rendering", () => {
    it("renders appropriate input based on field type", () => {
      const props = createMockSearchRowProps({
        row: mockSearchFields.firstName,
      });
      render(<SearchRow {...props} />);

      // Real FieldRenderer renders based on field type - firstName is a string field
      expect(
        screen.getByRole("textbox", { name: /Enter First Name/ }),
      ).toBeInTheDocument();
    });

    it("renders compound field sub-fields", () => {
      const props = createMockSearchRowProps({
        row: mockCompoundFields.name,
      });
      render(<SearchRow {...props} />);

      // Real CompoundFieldRenderer renders sub-fields based on compound field structure
      expect(
        screen.getByPlaceholderText("Enter First Name"),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter Last Name"),
      ).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls onFieldChange when field selector changes", async () => {
      const user = userEvent.setup();
      const mockOnFieldChange = jest.fn();
      const props = createMockSearchRowProps({
        onFieldChange: mockOnFieldChange,
        availableFields: [
          { label: "First Name", value: "firstName" },
          { label: "Last Name", value: "lastName" },
        ],
      });
      render(<SearchRow {...props} />);

      const fieldSelector = screen.getByTestId("field-selector");
      await user.selectOptions(fieldSelector, "lastName");

      expect(mockOnFieldChange).toHaveBeenCalledTimes(1);
      expect(mockOnFieldChange).toHaveBeenCalledWith(0, "lastName");
    });

    it("calls onValueChange when field value changes", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const fieldWithEmptyValue = {
        ...mockSearchFields.firstName,
        value: "",
      };
      const props = createMockSearchRowProps({
        onValueChange: mockOnValueChange,
        row: fieldWithEmptyValue,
      });
      render(<SearchRow {...props} />);

      const fieldInput = screen.getByRole("textbox", {
        name: /Enter First Name/,
      });
      await user.type(fieldInput, "John");

      expect(mockOnValueChange).toHaveBeenCalledTimes(4); // J, o, h, n
      expect(mockOnValueChange).toHaveBeenNthCalledWith(1, 0, "J", undefined);
      expect(mockOnValueChange).toHaveBeenNthCalledWith(2, 0, "o", undefined);
      expect(mockOnValueChange).toHaveBeenNthCalledWith(3, 0, "h", undefined);
      expect(mockOnValueChange).toHaveBeenNthCalledWith(4, 0, "n", undefined);
    });

    it("calls onValueChange with compound index for compound fields", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const compoundFieldWithEmptyValues = {
        ...mockCompoundFields.name,
        fields: [
          { ...mockCompoundFields.name.fields[0], value: "" },
          { ...mockCompoundFields.name.fields[1], value: "" },
        ],
      } as typeof mockCompoundFields.name;
      const props = createMockSearchRowProps({
        onValueChange: mockOnValueChange,
        row: compoundFieldWithEmptyValues,
      });
      render(<SearchRow {...props} />);

      const firstNameInput = screen.getByPlaceholderText("Enter First Name");
      await user.type(firstNameInput, "John");

      expect(mockOnValueChange).toHaveBeenCalledTimes(4); // J, o, h, n
      expect(mockOnValueChange).toHaveBeenNthCalledWith(1, 0, "J", 0);
      expect(mockOnValueChange).toHaveBeenNthCalledWith(2, 0, "o", 0);
      expect(mockOnValueChange).toHaveBeenNthCalledWith(3, 0, "h", 0);
      expect(mockOnValueChange).toHaveBeenNthCalledWith(4, 0, "n", 0);
    });

    it("calls onRemoveRow when remove button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnRemoveRow = jest.fn();
      const props = createMockSearchRowProps({
        onRemoveRow: mockOnRemoveRow,
        canRemove: true,
      });
      render(<SearchRow {...props} />);

      const removeButton = screen.getByRole("button", {
        name: "Remove search criteria 1",
      });
      await user.click(removeButton);

      expect(mockOnRemoveRow).toHaveBeenCalledTimes(1);
      expect(mockOnRemoveRow).toHaveBeenCalledWith(0);
    });
  });

  describe("Props Handling", () => {
    it("passes correct props to field selector", () => {
      const props = createMockSearchRowProps({
        row: mockSearchFields.firstName,
        availableFields: [
          { label: "First Name", value: "firstName" },
          { label: "Last Name", value: "lastName" },
        ],
      });
      render(<SearchRow {...props} />);

      const fieldSelector = screen.getByTestId("field-selector");
      expect(fieldSelector).toHaveValue("firstName");
    });

    it("passes correct props to field renderer", () => {
      const fieldWithoutValue = {
        ...mockSearchFields.firstName,
        value: undefined,
      };
      const props = createMockSearchRowProps({
        row: fieldWithoutValue,
        dropdownList: createMockDropdownLists(),
      });
      render(<SearchRow {...props} />);

      const fieldInput = screen.getByRole("textbox", {
        name: /Enter First Name/,
      });
      expect(fieldInput).toBeInTheDocument();
      expect(fieldInput).toHaveValue("");
    });

    it("handles different row indices correctly", () => {
      const props = createMockSearchRowProps({
        index: 2,
      });
      render(<SearchRow {...props} />);

      expect(
        screen.getByRole("group", { name: "Search criteria 3" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("combobox", {
          name: /Select search field for criteria 3/,
        }),
      ).toHaveAttribute("aria-label", "Select search field for criteria 3");
    });
  });

  describe("Edge Cases", () => {
    it("handles missing row by throwing error", () => {
      const props = createMockSearchRowProps({
        row: undefined as unknown as SearchField,
      });

      // Should throw an error when row is undefined
      expect(() => render(<SearchRow {...props} />)).toThrow();
    });

    it("renders field selector even with empty availableFields array", () => {
      const props = createMockSearchRowProps({
        availableFields: [],
      });
      render(<SearchRow {...props} />);

      const fieldSelector = screen.getByRole("combobox", {
        name: /Select search field for criteria 1/,
      });
      expect(fieldSelector).toBeInTheDocument();
    });

    it("renders field selector for compound field with no sub-fields", () => {
      const emptyCompoundField = {
        ...mockCompoundFields.name,
        fields: [],
      };
      const props = createMockSearchRowProps({
        row: emptyCompoundField,
      });
      render(<SearchRow {...props} />);

      const fieldSelector = screen.getByRole("combobox", {
        name: /Select search field for criteria 1/,
      });
      expect(fieldSelector).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has correct ARIA labels", () => {
      const props = createMockSearchRowProps({
        index: 1,
      });
      render(<SearchRow {...props} />);

      expect(
        screen.getByRole("group", { name: "Search criteria 2" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("combobox", {
          name: /Select search field for criteria 2/,
        }),
      ).toHaveAttribute("aria-label", "Select search field for criteria 2");
    });

    it("has correct button labels", () => {
      const props = createMockSearchRowProps({
        index: 0,
        canRemove: true,
      });
      render(<SearchRow {...props} />);

      const removeButton = screen.getByRole("button", {
        name: "Remove search criteria 1",
      });
      expect(removeButton).toHaveAttribute("title", "Remove Search Criteria");
    });

    it("has correct input labels", () => {
      const props = createMockSearchRowProps({
        row: mockSearchFields.firstName,
      });
      render(<SearchRow {...props} />);

      const fieldInput = screen.getByRole("textbox", {
        name: /Enter First Name/,
      });
      expect(fieldInput).toHaveAttribute("placeholder", "Enter First Name");
    });
  });
});
