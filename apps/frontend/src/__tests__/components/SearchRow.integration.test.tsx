import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { SearchRow } from "~/components/search/SearchRow";
import {
  createMockSearchRowProps,
  createMockDropdownLists,
  cleanupMocks,
  testSearchFields,
} from "~/__tests__/utils/searchTestUtils";

import type { ComboboxDropdownProps } from "~/components/ui/ComboBox";

jest.mock("~/components/ui/ComboBox", () => ({
  ComboboxDropdown: ({
    items,
    initialValue,
    onSelect,
    ariaLabel,
  }: ComboboxDropdownProps) => (
    <select
      data-testid="combobox-dropdown"
      value={initialValue}
      onChange={(e) => onSelect(e.target.value)}
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  ),
}));

// Integration tests for SearchRow using real FieldRenderer and CompoundFieldRenderer components
// These tests validate actual field type switching and validation logic

describe("SearchRow Real Component Integration", () => {
  beforeEach(() => {
    cleanupMocks();
  });

  describe("FieldRenderer Integration", () => {
    it("renders real FieldRenderer component for string fields", () => {
      const props = createMockSearchRowProps({
        row: testSearchFields.stringField,
      });
      render(<SearchRow {...props} />);

      const input = screen.getByRole("textbox", { name: /Enter Voter ID/ });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("123456789");
      expect(input).toHaveAttribute("id", "VRCNUM-0-0");
    });

    it("renders real FieldRenderer component for number fields", () => {
      const props = createMockSearchRowProps({
        row: testSearchFields.numberField,
      });
      render(<SearchRow {...props} />);

      const input = screen.getByRole("spinbutton", {
        name: /Enter House Number/,
      });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(123);
      expect(input).toHaveAttribute("id", "houseNum-0-0");
    });

    it("renders real FieldRenderer component for boolean fields", () => {
      const props = createMockSearchRowProps({
        row: testSearchFields.booleanField,
      });
      render(<SearchRow {...props} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
      expect(checkbox).toHaveAttribute("id", "hasEmail-0-0");
    });

    it("renders real FieldRenderer component for dropdown fields", () => {
      const props = createMockSearchRowProps({
        row: testSearchFields.dropdownField,
        dropdownList: createMockDropdownLists(),
      });
      render(<SearchRow {...props} />);

      const dropdown = screen.getByRole("combobox", { name: /Select Party/ });
      expect(dropdown).toBeInTheDocument();
    });

    it("renders real FieldRenderer component for date fields", () => {
      const props = createMockSearchRowProps({
        row: testSearchFields.dateField,
      });
      render(<SearchRow {...props} />);

      const dateButton = screen.getByRole("button", {
        name: /Select Date of Birth/,
      });
      expect(dateButton).toBeInTheDocument();
      expect(dateButton).toHaveAttribute("aria-label", "Select Date of Birth");
    });
  });

  describe("CompoundFieldRenderer Integration", () => {
    it("renders real CompoundFieldRenderer with sub-fields for name compound field", () => {
      const props = createMockSearchRowProps({
        row: testSearchFields.compoundNameField,
        dropdownList: createMockDropdownLists(),
      });
      render(<SearchRow {...props} />);

      const firstNameInput = screen.getByPlaceholderText("Enter First Name(s)");
      const lastNameInput = screen.getByPlaceholderText("Enter Last Name(s)");

      expect(firstNameInput).toBeInTheDocument();
      expect(lastNameInput).toBeInTheDocument();
    });

    it("renders real CompoundFieldRenderer with sub-fields for address compound field", () => {
      const props = createMockSearchRowProps({
        row: testSearchFields.compoundAddressField,
        dropdownList: createMockDropdownLists(),
      });
      render(<SearchRow {...props} />);

      const houseNumberInput = screen.getByRole("spinbutton", {
        name: /Enter House Number/,
      });
      const streetInput = screen.getByPlaceholderText("Enter Street(s)");

      expect(houseNumberInput).toBeInTheDocument();
      expect(streetInput).toBeInTheDocument();
    });
  });

  describe("Field Type Switching", () => {
    it("correctly switches from string field to dropdown field", async () => {
      const user = userEvent.setup();
      const mockOnFieldChange = jest.fn();
      const props = createMockSearchRowProps({
        onFieldChange: mockOnFieldChange,
        availableFields: [
          { label: "Voter ID", value: "VRCNUM" },
          { label: "Party", value: "party" },
          { label: "Name", value: "name" },
        ],
        row: testSearchFields.stringField,
      });
      render(<SearchRow {...props} />);

      // Initially shows string input for VRCNUM
      const stringInput = screen.getByRole("textbox", {
        name: /Enter Voter ID/,
      });
      expect(stringInput).toBeInTheDocument();

      // Change to party field (dropdown)
      const fieldSelector = screen.getByRole("combobox", {
        name: /Select search field for criteria 1/,
      });
      await user.selectOptions(fieldSelector, "party");

      expect(mockOnFieldChange).toHaveBeenCalledWith(0, "party");
    });

    it("correctly switches from string field to compound field", async () => {
      const user = userEvent.setup();
      const mockOnFieldChange = jest.fn();
      const props = createMockSearchRowProps({
        onFieldChange: mockOnFieldChange,
        availableFields: [
          { label: "Voter ID", value: "VRCNUM" },
          { label: "Name", value: "name" },
        ],
        row: testSearchFields.stringField,
      });
      render(<SearchRow {...props} />);

      // Initially shows string input
      const stringInput = screen.getByRole("textbox", {
        name: /Enter Voter ID/,
      });
      expect(stringInput).toBeInTheDocument();

      // Change to name field (compound)
      const fieldSelector = screen.getByRole("combobox", {
        name: /Select search field for criteria 1/,
      });
      await user.selectOptions(fieldSelector, "name");

      expect(mockOnFieldChange).toHaveBeenCalledWith(0, "name");
    });
  });

  describe("Value Changes", () => {
    it("calls onValueChange with each character typed in string input", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockSearchRowProps({
        onValueChange: mockOnValueChange,
        row: testSearchFields.emptyStringField,
      });
      render(<SearchRow {...props} />);

      const input = screen.getByRole("textbox", { name: /Enter Voter ID/ });
      await user.type(input, "123456");

      expect(mockOnValueChange).toHaveBeenCalledTimes(6); // Each character typed
      expect(mockOnValueChange).toHaveBeenLastCalledWith(0, "6", undefined);
    });

    it("calls onValueChange with parsed number after typing", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockSearchRowProps({
        onValueChange: mockOnValueChange,
        row: testSearchFields.numberField,
      });
      render(<SearchRow {...props} />);

      const input = screen.getByRole("spinbutton", {
        name: /Enter House Number/,
      });
      await user.clear(input);
      await user.type(input, "456");

      expect(mockOnValueChange).toHaveBeenCalledTimes(4); // Clear + 3 characters
      expect(mockOnValueChange).toHaveBeenLastCalledWith(0, 1236, undefined);
    });

    it("calls onValueChange when checkbox is toggled", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockSearchRowProps({
        onValueChange: mockOnValueChange,
        row: testSearchFields.booleanField,
      });
      render(<SearchRow {...props} />);

      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      expect(mockOnValueChange).toHaveBeenCalledTimes(1);
      expect(mockOnValueChange).toHaveBeenCalledWith(0, false, undefined);
    });

    it("calls onValueChange when dropdown option is selected", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockSearchRowProps({
        onValueChange: mockOnValueChange,
        row: testSearchFields.dropdownField,
        dropdownList: createMockDropdownLists(),
      });
      render(<SearchRow {...props} />);

      const dropdown = screen.getByRole("combobox", { name: /Select Party/ });
      await user.selectOptions(dropdown, "REP");

      expect(mockOnValueChange).toHaveBeenCalledTimes(1);
      expect(mockOnValueChange).toHaveBeenCalledWith(0, "REP", undefined);
    });
  });

  describe("Compound Field Value Changes", () => {
    it("handles value changes in firstName sub-field of compound field", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockSearchRowProps({
        onValueChange: mockOnValueChange,
        row: testSearchFields.compoundNameField,
        dropdownList: createMockDropdownLists(),
      });
      render(<SearchRow {...props} />);

      const firstNameInput = screen.getByPlaceholderText("Enter First Name(s)");
      await user.type(firstNameInput, "John");

      expect(firstNameInput).toHaveValue("John");
    });

    it("handles value changes in lastName sub-field of compound field", async () => {
      const user = userEvent.setup();
      const mockOnValueChange = jest.fn();
      const props = createMockSearchRowProps({
        onValueChange: mockOnValueChange,
        row: testSearchFields.compoundNameField,
        dropdownList: createMockDropdownLists(),
      });
      render(<SearchRow {...props} />);

      const lastNameInput = screen.getByPlaceholderText("Enter Last Name(s)");
      await user.type(lastNameInput, "Doe");

      expect(lastNameInput).toHaveValue("Doe");
    });
  });

  describe("Field Selector Integration", () => {
    it("renders field selector with correct options and accessibility", () => {
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

      // Check that options are available
      expect(screen.getByText("First Name")).toBeInTheDocument();
      expect(screen.getByText("Last Name")).toBeInTheDocument();
      expect(screen.getByText("Voter ID")).toBeInTheDocument();
    });

    it("calls onFieldChange when field selector option is selected", async () => {
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

      const fieldSelector = screen.getByRole("combobox", {
        name: /Select search field for criteria 1/,
      });
      await user.selectOptions(fieldSelector, "lastName");

      expect(mockOnFieldChange).toHaveBeenCalledTimes(1);
      expect(mockOnFieldChange).toHaveBeenCalledWith(0, "lastName");
    });
  });

  describe("Component Validation", () => {
    it("validates field type switching from string to dropdown to compound", async () => {
      const user = userEvent.setup();
      const mockOnFieldChange = jest.fn();
      const props = createMockSearchRowProps({
        onFieldChange: mockOnFieldChange,
        availableFields: [
          { label: "Voter ID", value: "VRCNUM" },
          { label: "Party", value: "party" },
          { label: "Name", value: "name" },
        ],
        row: testSearchFields.stringField,
      });
      render(<SearchRow {...props} />);

      const fieldSelector = screen.getByRole("combobox", {
        name: /Select search field for criteria 1/,
      });

      // Test switching from string to dropdown
      await user.selectOptions(fieldSelector, "party");
      expect(mockOnFieldChange).toHaveBeenCalledWith(0, "party");

      // Test switching from dropdown to compound
      await user.selectOptions(fieldSelector, "name");
      expect(mockOnFieldChange).toHaveBeenCalledWith(0, "name");
    });

    it("validates checkbox accessibility attributes and label association", () => {
      const props = createMockSearchRowProps({
        row: testSearchFields.booleanField,
      });
      render(<SearchRow {...props} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute("id");

      // Check that label is properly associated
      const labels = screen.getAllByText("Only records with an email");
      expect(labels.length).toBeGreaterThan(0); // At least one label should exist
      const label = labels.find((el) => el.tagName === "LABEL");
      expect(label).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("maintains accessibility with real field renderers", () => {
      const props = createMockSearchRowProps({
        row: testSearchFields.stringField,
        index: 1,
      });
      render(<SearchRow {...props} />);

      const group = screen.getByRole("group", { name: "Search criteria 2" });
      expect(group).toBeInTheDocument();

      const fieldSelector = screen.getByRole("combobox", {
        name: "Select search field for criteria 2",
      });
      expect(fieldSelector).toBeInTheDocument();

      const input = screen.getByRole("textbox", { name: /Enter Voter ID/ });
      expect(input).toBeInTheDocument();
    });

    it("maintains accessibility with real compound field renderers", () => {
      const props = createMockSearchRowProps({
        row: testSearchFields.compoundNameField,
        dropdownList: createMockDropdownLists(),
        index: 2,
      });
      render(<SearchRow {...props} />);

      const group = screen.getByRole("group", { name: "Search criteria 3" });
      expect(group).toBeInTheDocument();

      const firstNameInput = screen.getByPlaceholderText("Enter First Name(s)");
      const lastNameInput = screen.getByPlaceholderText("Enter Last Name(s)");

      expect(firstNameInput).toBeInTheDocument();
      expect(lastNameInput).toBeInTheDocument();
    });
  });
});
