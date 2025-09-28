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

describe("VoterRecordSearch", () => {
  beforeEach(() => {
    cleanupMocks();
  });

  describe("Complete User Search Journey", () => {
    it("allows user to enter first name and add street criteria", async () => {
      const user = userEvent.setup();
      const mockHandleSubmit = jest.fn().mockResolvedValue(Promise.resolve());
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });

      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      // User starts with initial search criteria
      const initialRows = screen.getAllByRole("group", {
        name: /Search criteria \d+/,
      });
      expect(initialRows).toHaveLength(2);

      // Keep the default name field and enter search data
      const firstNameInput = screen.getByPlaceholderText("Enter First Name(s)");
      await user.type(firstNameInput, "John");

      // User wants to add address criteria
      const addButton = screen.getByRole("button", {
        name: /Add another search criteria/i,
      });
      await user.click(addButton);

      // Enter street address in the new criteria row (uses default empty field)
      const streetInput = screen.getByPlaceholderText("Enter Street(s)");
      await user.type(streetInput, "Main St");

      // Submit the search
      const submitButton = screen.getByRole("button", { name: /Submit/i });
      await user.click(submitButton);

      // Verify the search was submitted with correct data
      expect(mockHandleSubmit).toHaveBeenCalledWith([
        expect.objectContaining({
          name: "name",
          compoundType: true,
          fields: expect.arrayContaining([
            expect.objectContaining({
              name: "firstName",
              value: ["John"],
            }),
          ]),
        }),
      ]);
    });

    it("allows user to enter multiple criteria and remove one before submission", async () => {
      const user = userEvent.setup();
      const mockHandleSubmit = jest.fn().mockResolvedValue(Promise.resolve());
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });

      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      // Enter data in first criteria
      const firstNameInput = screen.getByPlaceholderText("Enter First Name(s)");
      await user.type(firstNameInput, "John");

      // Add another criteria
      const addButton = screen.getByRole("button", {
        name: /Add another search criteria/i,
      });
      await user.click(addButton);

      // Enter data in the new criteria (uses default empty field)
      const lastNameInput = screen.getByPlaceholderText("Enter Last Name(s)");
      await user.type(lastNameInput, "Doe");

      // Remove the middle criteria to test modification
      const removeButtons = screen.getAllByRole("button", {
        name: /Remove search criteria \d+/i,
      });
      expect(removeButtons).toHaveLength(3); // Should have 3 remove buttons now
      const secondButton = removeButtons[1];
      expect(secondButton).toBeDefined();
      if (secondButton) {
        await user.click(secondButton); // Remove second criteria
      }

      // Submit search
      const submitButton = screen.getByRole("button", { name: /Submit/i });
      await user.click(submitButton);

      // Verify final search structure
      expect(mockHandleSubmit).toHaveBeenCalledWith([
        expect.objectContaining({
          name: "name",
          compoundType: true,
          fields: expect.arrayContaining([
            expect.objectContaining({
              name: "firstName",
              value: ["John"],
            }),
            expect.objectContaining({
              name: "lastName",
              value: ["Doe"],
            }),
          ]),
        }),
      ]);
    });
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
      expect(
        screen.getByRole("group", { name: "Search criteria 1" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("group", { name: "Search criteria 2" }),
      ).toBeInTheDocument();

      // Check initial field names by looking at the dropdown buttons
      const firstFieldDropdown = screen.getByRole("combobox", {
        name: /select search field for criteria 1/i,
      });
      const secondFieldDropdown = screen.getByRole("combobox", {
        name: /select search field for criteria 2/i,
      });

      expect(firstFieldDropdown).toBeInTheDocument();
      expect(secondFieldDropdown).toBeInTheDocument();
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
      expect(
        screen.getByRole("group", { name: "Search criteria 3" }),
      ).toBeInTheDocument();

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

      const removeButton = screen.getByRole("button", {
        name: /remove search criteria 1/i,
      });
      await user.click(removeButton);

      // Should now have 1 search row (removed one)
      // The remaining row should be re-indexed to 0
      expect(
        screen.getByRole("group", { name: "Search criteria 1" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("group", { name: "Search criteria 2" }),
      ).not.toBeInTheDocument();

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
      const removeButton = screen.getByRole("button", {
        name: /remove search criteria 1/i,
      });
      await user.click(removeButton);

      // Remove the second row (now indexed as 0)
      const removeButton2 = screen.getByRole("button", {
        name: /remove search criteria 1/i,
      });
      await user.click(removeButton2);

      // Check announcement
      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent(
          "Search criteria cleared. Ready for new search.",
        );
      });
    });

    it("renders field selector dropdown with proper accessibility", async () => {
      const user = userEvent.setup();
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      // Find the first field dropdown
      const fieldDropdown = screen.getByRole("combobox", {
        name: /select search field for criteria 1/i,
      });

      expect(fieldDropdown).toBeInTheDocument();
      expect(fieldDropdown).toHaveAttribute(
        "aria-label",
        "Select search field for criteria 1",
      );
    });
  });

  describe("Form Submission", () => {
    it("submits empty form when no meaningful data is present", async () => {
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

    it("validates structure of empty form submission", async () => {
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

      // Validate structure - empty because initial fields have no values
      expect(Array.isArray(submittedData)).toBe(true);
      expect(submittedData).toHaveLength(0);
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
    it("submits form with Ctrl+Enter or Cmd+Enter", async () => {
      const mockHandleSubmit = jest.fn().mockResolvedValue(undefined);
      const props = createMockVoterRecordSearchProps({
        handleSubmit: mockHandleSubmit,
      });
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      // Test Ctrl+Enter
      const ctrlEnterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(ctrlEnterEvent);

      await waitFor(() => {
        expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
      });

      // Reset mock and test Cmd+Enter (Mac)
      mockHandleSubmit.mockClear();
      const cmdEnterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        metaKey: true,
        bubbles: true,
      });
      document.dispatchEvent(cmdEnterEvent);

      await waitFor(() => {
        expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
      });
    });

    it("adds new criteria with Ctrl+Plus, Ctrl+Equals, or Cmd+Plus", async () => {
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      // Test Ctrl+Plus
      const ctrlPlusEvent = new KeyboardEvent("keydown", {
        key: "+",
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(ctrlPlusEvent);

      await waitFor(() => {
        expect(
          screen.getByRole("group", { name: "Search criteria 3" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent(
          "New search criteria added. Total: 3 criteria.",
        );
      });

      // Test Ctrl+Equals
      const ctrlEqualsEvent = new KeyboardEvent("keydown", {
        key: "=",
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(ctrlEqualsEvent);

      await waitFor(() => {
        expect(
          screen.getByRole("group", { name: "Search criteria 4" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent(
          "New search criteria added. Total: 4 criteria.",
        );
      });

      // Test Cmd+Plus (Mac)
      const cmdPlusEvent = new KeyboardEvent("keydown", {
        key: "+",
        metaKey: true,
        bubbles: true,
      });
      document.dispatchEvent(cmdPlusEvent);

      await waitFor(() => {
        expect(
          screen.getByRole("group", { name: "Search criteria 5" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent(
          "New search criteria added. Total: 5 criteria.",
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
    it("allows adding multiple search criteria through repeated button clicks", async () => {
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
      expect(
        screen.getByRole("group", { name: "Search criteria 5" }),
      ).toBeInTheDocument();
    });

    it("handles empty search rows gracefully", () => {
      const props = createMockVoterRecordSearchProps();
      renderWithVoterSearchProvider(<VoterRecordSearch {...props} />);

      // Component should render without errors even with empty initial state
      expect(screen.getByRole("search")).toBeInTheDocument();
    });
  });
});
