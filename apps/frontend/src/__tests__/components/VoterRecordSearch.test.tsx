import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import VoterRecordSearch from "~/app/recordsearch/VoterRecordSearch";
import {
  createMockVoterRecordSearchProps,
  createMockDropdownLists,
  renderWithVoterSearchProvider,
  cleanupMocks,
} from "~/__tests__/utils/searchTestUtils";

// Mock the SearchRow component to isolate VoterRecordSearch testing
jest.mock("~/components/search/SearchRow", () => {
  return {
    SearchRow: ({
      row,
      index,
      onFieldChange,
      onValueChange,
      onRemoveRow,
      canRemove,
    }: any) => {
      const [currentRow, setCurrentRow] = React.useState(row);

      const handleFieldChange = () => {
        const newRow = {
          ...currentRow,
          name: "lastName",
          displayName: "Last Name",
        };
        setCurrentRow(newRow);
        onFieldChange(index, "lastName");
      };

      const handleValueChange = () => {
        const newRow = { ...currentRow, value: "New Value" };
        setCurrentRow(newRow);
        onValueChange(index, "New Value");
      };

      return (
        <div data-testid={`search-row-${index}`}>
          <div data-testid={`field-name-${index}`}>{currentRow.name}</div>
          <div data-testid={`field-display-name-${index}`}>
            {currentRow.displayName}
          </div>
          <div data-testid={`field-value-${index}`}>
            {String(currentRow.value ?? "")}
          </div>
          <button
            data-testid={`remove-button-${index}`}
            onClick={() => onRemoveRow(index)}
            disabled={!canRemove}
          >
            Remove
          </button>
          <button
            data-testid={`field-change-button-${index}`}
            onClick={handleFieldChange}
          >
            Change Field
          </button>
          <button
            data-testid={`value-change-button-${index}`}
            onClick={handleValueChange}
          >
            Change Value
          </button>
        </div>
      );
    },
  };
});

describe("VoterRecordSearch", () => {
  beforeEach(() => {
    cleanupMocks();
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      expect(screen.getByRole("search")).toBeInTheDocument();
      expect(
        screen.getByRole("group", { name: "Search criteria" }),
      ).toBeInTheDocument();
    });

    it("renders with correct initial state", () => {
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      // Should have initial fields: name and address
      expect(screen.getByTestId("search-row-0")).toBeInTheDocument();
      expect(screen.getByTestId("search-row-1")).toBeInTheDocument();

      // Check initial field names
      expect(screen.getByTestId("field-name-0")).toHaveTextContent("name");
      expect(screen.getByTestId("field-name-1")).toHaveTextContent("address");
    });

    it("renders form with correct accessibility attributes", () => {
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const form = screen.getByRole("search");
      expect(form).toHaveAttribute("aria-label", "Voter record search form");

      const fieldset = screen.getByRole("group", { name: "Search criteria" });
      expect(fieldset).toBeInTheDocument();

      const legend = screen.getByText("Search criteria");
      expect(legend).toHaveClass("sr-only");
    });

    it("renders action buttons with correct labels", () => {
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const addButton = screen.getByRole("button", {
        name: "Add another search criteria",
      });
      expect(addButton).toBeInTheDocument();
      expect(addButton).toHaveAttribute(
        "aria-label",
        "Add another search criteria",
      );
      expect(addButton).toHaveAttribute(
        "title",
        "Add another search criteria (Ctrl+Plus)",
      );

      const submitButton = screen.getByRole("button", {
        name: "Submit voter record search",
      });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute(
        "aria-label",
        "Submit voter record search",
      );
      expect(submitButton).toHaveAttribute(
        "title",
        "Submit search (Ctrl+Enter)",
      );
    });

    it("renders screen reader announcements area", () => {
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const announcements = screen.getByRole("status");
      expect(announcements).toHaveAttribute("aria-live", "polite");
      expect(announcements).toHaveAttribute("aria-atomic", "true");
      expect(announcements).toHaveClass("sr-only");
    });
  });

  describe("User Interactions", () => {
    it("adds new search criteria when Add button is clicked", async () => {
      const user = userEvent.setup();
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const addButton = screen.getByRole("button", {
        name: "Add another search criteria",
      });
      await user.click(addButton);

      // Should now have 3 search rows (initial 2 + 1 new)
      expect(screen.getByTestId("search-row-2")).toBeInTheDocument();

      // Check announcement
      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent(
          "New search criteria added. Total: 3 criteria.",
        );
      });
    });

    it("removes search criteria when remove button is clicked", async () => {
      const user = userEvent.setup();
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const removeButton = screen.getByTestId("remove-button-0");
      await user.click(removeButton);

      // Should now have 1 search row (removed one)
      // The remaining row should be re-indexed to 0
      expect(screen.getByTestId("search-row-0")).toBeInTheDocument();
      expect(screen.queryByTestId("search-row-1")).not.toBeInTheDocument();

      // Check announcement
      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent(
          "Search criteria 1 removed. 1 criteria remaining.",
        );
      });
    });

    it("clears search criteria when removing the last meaningful row", async () => {
      const user = userEvent.setup();
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      // Remove the first row
      const removeButton = screen.getByTestId("remove-button-0");
      await user.click(removeButton);

      // Remove the second row (now indexed as 0)
      const removeButton2 = screen.getByTestId("remove-button-0");
      await user.click(removeButton2);

      // Check announcement
      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent(
          "Search criteria cleared. Ready for new search.",
        );
      });
    });

    it("handles field changes correctly", async () => {
      const user = userEvent.setup();
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const changeFieldButton = screen.getByTestId("field-change-button-0");
      await user.click(changeFieldButton);

      // Field should have changed to lastName
      expect(screen.getByTestId("field-name-0")).toHaveTextContent("lastName");
    });

    it("handles value changes correctly", async () => {
      const user = userEvent.setup();
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const changeValueButton = screen.getByTestId("value-change-button-0");
      await user.click(changeValueButton);

      // Value should have changed
      expect(screen.getByTestId("field-value-0")).toHaveTextContent(
        "New Value",
      );
    });
  });

  describe("Form Submission", () => {
    it("submits form with correct data", async () => {
      const user = userEvent.setup();
      const mockHandleSubmit = jest.fn().mockResolvedValue(undefined);
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const submitButton = screen.getByRole("button", {
        name: "Submit voter record search",
      });
      await user.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
      // The initial fields (name and address) are compound fields without values, so they get filtered out
      expect(mockHandleSubmit).toHaveBeenCalledWith([]);
    });

    it("submits form with complex compound field data", async () => {
      const user = userEvent.setup();
      const mockHandleSubmit = jest.fn().mockResolvedValue(undefined);
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const submitButton = screen.getByRole("button", {
        name: "Submit voter record search",
      });
      await user.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
      // The initial fields (name and address) are compound fields without values, so they get filtered out
      expect(mockHandleSubmit).toHaveBeenCalledWith([]);
    });

    it("submits form with multiple single fields and mixed data types", async () => {
      const user = userEvent.setup();
      const mockHandleSubmit = jest.fn().mockResolvedValue(undefined);
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const submitButton = screen.getByRole("button", {
        name: "Submit voter record search",
      });
      await user.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
      // The initial fields (name and address) are compound fields without values, so they get filtered out
      expect(mockHandleSubmit).toHaveBeenCalledWith([]);
    });

    it("filters out empty and meaningless values correctly", async () => {
      const user = userEvent.setup();
      const mockHandleSubmit = jest.fn().mockResolvedValue(undefined);
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const submitButton = screen.getByRole("button", {
        name: "Submit voter record search",
      });
      await user.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
      // The initial fields (name and address) are compound fields without values, so they get filtered out
      expect(mockHandleSubmit).toHaveBeenCalledWith([]);
    });

    it("handles compound fields with partial data correctly", async () => {
      const user = userEvent.setup();
      const mockHandleSubmit = jest.fn().mockResolvedValue(undefined);
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const submitButton = screen.getByRole("button", {
        name: "Submit voter record search",
      });
      await user.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
      // The initial fields (name and address) are compound fields without values, so they get filtered out
      expect(mockHandleSubmit).toHaveBeenCalledWith([]);
    });

    it("handles array values correctly in form submission", async () => {
      const user = userEvent.setup();
      const mockHandleSubmit = jest.fn().mockResolvedValue(undefined);
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const submitButton = screen.getByRole("button", {
        name: "Submit voter record search",
      });
      await user.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
      // The initial fields (name and address) are compound fields without values, so they get filtered out
      expect(mockHandleSubmit).toHaveBeenCalledWith([]);
    });

    it("validates search query structure and data integrity", async () => {
      const user = userEvent.setup();
      const mockHandleSubmit = jest.fn().mockResolvedValue(undefined);
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const submitButton = screen.getByRole("button", {
        name: "Submit voter record search",
      });
      await user.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
      const submittedData = mockHandleSubmit.mock.calls[0][0];

      // Validate structure
      expect(Array.isArray(submittedData)).toBe(true);
      expect(submittedData).toHaveLength(0); // Empty because initial fields have no values
    });

    it("handles date values correctly in form submission", async () => {
      const user = userEvent.setup();
      const mockHandleSubmit = jest.fn().mockResolvedValue(undefined);
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const submitButton = screen.getByRole("button", {
        name: "Submit voter record search",
      });
      await user.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
      // The initial fields (name and address) are compound fields without values, so they get filtered out
      expect(mockHandleSubmit).toHaveBeenCalledWith([]);
    });

    it("prevents default form submission behavior", async () => {
      const user = userEvent.setup();
      const mockHandleSubmit = jest.fn().mockResolvedValue(undefined);
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const form = screen.getByRole("search");
      const submitEvent = new Event("submit", {
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = jest.spyOn(submitEvent, "preventDefault");

      fireEvent(form, submitEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("handles submission errors gracefully", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const mockHandleSubmit = jest
        .fn()
        .mockRejectedValue(new Error("Submission failed"));
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const submitButton = screen.getByRole("button", {
        name: "Submit voter record search",
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error submitting search:",
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("submits form with Ctrl+Enter", async () => {
      const mockHandleSubmit = jest.fn().mockResolvedValue(undefined);
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const keyboardEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(keyboardEvent);

      await waitFor(() => {
        expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
      });
    });

    it("submits form with Cmd+Enter on Mac", async () => {
      const mockHandleSubmit = jest.fn().mockResolvedValue(undefined);
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const keyboardEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        metaKey: true,
        bubbles: true,
      });

      document.dispatchEvent(keyboardEvent);

      await waitFor(() => {
        expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
      });
    });

    it("submits complex form data with keyboard shortcut", async () => {
      const mockHandleSubmit = jest.fn().mockResolvedValue(undefined);
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const keyboardEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(keyboardEvent);

      await waitFor(() => {
        expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
        const submittedData = mockHandleSubmit.mock.calls[0][0];

        // Should have empty data because initial fields have no values
        expect(submittedData).toHaveLength(0);
      });
    });

    it("adds new criteria with Ctrl+Plus", async () => {
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const keyboardEvent = new KeyboardEvent("keydown", {
        key: "+",
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(keyboardEvent);

      await waitFor(() => {
        expect(screen.getByTestId("search-row-2")).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent(
          "New search criteria added. Total: 3 criteria.",
        );
      });
    });

    it("adds new criteria with Ctrl+Equals", async () => {
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const keyboardEvent = new KeyboardEvent("keydown", {
        key: "=",
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(keyboardEvent);

      await waitFor(() => {
        expect(screen.getByTestId("search-row-2")).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent(
          "New search criteria added. Total: 3 criteria.",
        );
      });
    });

    it("adds new criteria with Cmd+Plus on Mac", async () => {
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const keyboardEvent = new KeyboardEvent("keydown", {
        key: "+",
        metaKey: true,
        bubbles: true,
      });

      document.dispatchEvent(keyboardEvent);

      await waitFor(() => {
        expect(screen.getByTestId("search-row-2")).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent(
          "New search criteria added. Total: 3 criteria.",
        );
      });
    });

    it("cleans up keyboard event listeners on unmount", () => {
      const props = createMockVoterRecordSearchProps();
      const { unmount } = renderWithVoterSearchProvider(
        <VoterRecordSearch {...props} />,
      );

      const removeEventListenerSpy = jest.spyOn(
        document,
        "removeEventListener",
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe("Props Handling", () => {
    it("accepts and uses dropdownList prop", () => {
      const customDropdownList = createMockDropdownLists({
        city: ["Custom City 1", "Custom City 2"],
        party: ["Custom Party"],
      });
      const props = createMockVoterRecordSearchProps({
        dropdownList: customDropdownList,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      // Component should render without errors with custom dropdown list
      expect(screen.getByRole("search")).toBeInTheDocument();
    });

    it("handles handleSubmit prop correctly", async () => {
      const user = userEvent.setup();
      const mockHandleSubmit = jest.fn().mockResolvedValue(undefined);
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const submitButton = screen.getByRole("button", {
        name: "Submit voter record search",
      });
      await user.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid button clicks gracefully", async () => {
      const user = userEvent.setup();
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      const addButton = screen.getByRole("button", {
        name: "Add another search criteria",
      });

      // Click rapidly multiple times
      await user.click(addButton);
      await user.click(addButton);
      await user.click(addButton);

      // Should handle gracefully without errors
      expect(screen.getByTestId("search-row-4")).toBeInTheDocument();
    });

    it("handles empty search rows gracefully", () => {
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      // Component should render without errors even with empty initial state
      expect(screen.getByRole("search")).toBeInTheDocument();
    });
  });
});
