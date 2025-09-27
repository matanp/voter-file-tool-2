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

// Mock the FieldRenderer and CompoundFieldRenderer components
jest.mock("~/components/search/FieldRenderer", () => ({
  FieldRenderer: ({ field, onValueChange }: any) => (
    <div data-testid={`field-renderer-${field.name}`}>
      <input
        data-testid={`field-input-${field.name}`}
        value={String(field.value ?? "")}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={`Enter ${field.displayName}`}
      />
    </div>
  ),
}));

jest.mock("~/components/search/CompoundFieldRenderer", () => ({
  CompoundFieldRenderer: ({ field, onValueChange }: any) => (
    <div data-testid={`compound-field-renderer-${field.name}`}>
      {field.fields.map((subField: any, index: number) => (
        <div
          key={index}
          data-testid={`compound-subfield-${field.name}-${index}`}
        >
          <input
            data-testid={`compound-input-${field.name}-${index}`}
            value={String(subField.value ?? "")}
            onChange={(e) => onValueChange(e.target.value, index)}
            placeholder={`Enter ${subField.displayName}`}
          />
        </div>
      ))}
    </div>
  ),
}));

// Mock the ComboboxDropdown component
jest.mock("~/components/ui/ComboBox", () => ({
  ComboboxDropdown: ({ items, initialValue, onSelect, ariaLabel }: any) => (
    <select
      data-testid="field-selector"
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

// Mock the Button component
jest.mock("~/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
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

      const fieldSelector = screen.getByTestId("field-selector");
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

      const fieldSelector = screen.getByTestId("field-selector");
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
    it("renders FieldRenderer for non-compound fields", () => {
      const props = createMockSearchRowProps({
        row: mockSearchFields.firstName,
      });
      render(<SearchRow {...props} />);

      expect(
        screen.getByTestId("field-renderer-firstName"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("field-input-firstName")).toBeInTheDocument();
    });

    it("renders CompoundFieldRenderer for compound fields", () => {
      const props = createMockSearchRowProps({
        row: mockCompoundFields.name,
      });
      render(<SearchRow {...props} />);

      expect(
        screen.getByTestId("compound-field-renderer-name"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("compound-subfield-name-0"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("compound-subfield-name-1"),
      ).toBeInTheDocument();
    });

    it("does not render field renderer for empty fields", () => {
      const props = createMockSearchRowProps({
        row: mockSearchFields.empty,
      });
      render(<SearchRow {...props} />);

      expect(
        screen.queryByTestId("field-renderer-empty"),
      ).not.toBeInTheDocument();
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
      const props = createMockSearchRowProps({
        onValueChange: mockOnValueChange,
        row: mockSearchFields.firstName,
      });
      render(<SearchRow {...props} />);

      const fieldInput = screen.getByTestId("field-input-firstName");
      await user.type(fieldInput, "John");

      expect(mockOnValueChange).toHaveBeenCalledTimes(4); // J, o, h, n
      expect(mockOnValueChange).toHaveBeenLastCalledWith(0, "Johnn", undefined);
    });

    it("calls onValueChange with compound index for compound fields", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockSearchRowProps({
        onValueChange: mockOnValueChange,
        row: mockCompoundFields.name,
      });
      render(<SearchRow {...props} />);

      const firstNameInput = screen.getByTestId("compound-input-name-0");
      await user.type(firstNameInput, "John");

      expect(mockOnValueChange).toHaveBeenCalledTimes(4); // J, o, h, n
      expect(mockOnValueChange).toHaveBeenLastCalledWith(0, "Johnn", 0);
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

    it("prevents default behavior when remove button is clicked", async () => {
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
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = jest.spyOn(clickEvent, "preventDefault");

      fireEvent(removeButton, clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
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

      const fieldRenderer = screen.getByTestId("field-renderer-firstName");
      expect(fieldRenderer).toBeInTheDocument();

      const fieldInput = screen.getByTestId("field-input-firstName");
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
      expect(screen.getByTestId("field-selector")).toHaveAttribute(
        "aria-label",
        "Select search field for criteria 3",
      );
    });
  });

  describe("Edge Cases", () => {
    it("handles missing row by throwing error", () => {
      const props = createMockSearchRowProps({
        row: undefined as any,
      });

      // Should throw an error when row is undefined
      expect(() => render(<SearchRow {...props} />)).toThrow();
    });

    it("handles empty availableFields array", () => {
      const props = createMockSearchRowProps({
        availableFields: [],
      });
      render(<SearchRow {...props} />);

      const fieldSelector = screen.getByTestId("field-selector");
      expect(fieldSelector).toBeInTheDocument();
    });

    it("handles compound field with no sub-fields", () => {
      const emptyCompoundField = {
        ...mockCompoundFields.name,
        fields: [],
      };
      const props = createMockSearchRowProps({
        row: emptyCompoundField,
      });
      render(<SearchRow {...props} />);

      expect(
        screen.getByTestId("compound-field-renderer-name"),
      ).toBeInTheDocument();
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
      expect(screen.getByTestId("field-selector")).toHaveAttribute(
        "aria-label",
        "Select search field for criteria 2",
      );
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

      const fieldInput = screen.getByTestId("field-input-firstName");
      expect(fieldInput).toHaveAttribute("placeholder", "Enter First Name");
    });
  });
});
