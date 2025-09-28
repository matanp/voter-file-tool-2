import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchQueryDisplay } from "~/components/search/SearchQueryDisplay";
import type { SearchQueryField } from "@voter-file-tool/shared-validators";

// Mock the UI components
jest.mock("~/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
}));

jest.mock("~/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button data-testid="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

// Mock the date formatting function
jest.mock("~/lib/electionDateUtils", () => ({
  formatElectionDateForDisplay: (date: string) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  },
}));

describe("SearchQueryDisplay", () => {
  const mockOnClearSearch = jest.fn();
  const defaultProps = {
    totalRecords: 100,
    maxRecordsForExport: 1000,
    adminContactInfo: "Contact admin@example.com",
    onClearSearch: mockOnClearSearch,
  };

  beforeEach(() => {
    mockOnClearSearch.mockClear();
  });

  describe("when no search query", () => {
    it("renders no search query message", () => {
      render(<SearchQueryDisplay {...defaultProps} searchQuery={[]} />);

      expect(screen.getByText("No Search Query")).toBeInTheDocument();
      expect(
        screen.getByText(/Please go to the Record Search page/),
      ).toBeInTheDocument();
    });
  });

  describe("when search query has empty fields", () => {
    it("renders no search query message when all fields are empty", () => {
      const emptyFields: SearchQueryField[] = [
        {
          field: "VRCNUM",
          values: [""],
        },
        {
          field: "firstName",
          values: [null],
        },
      ];

      render(
        <SearchQueryDisplay {...defaultProps} searchQuery={emptyFields} />,
      );

      expect(screen.getByText("No Search Query")).toBeInTheDocument();
    });
  });

  describe("when search query has simple fields", () => {
    it("renders single value fields correctly", () => {
      const searchQuery: SearchQueryField[] = [
        {
          field: "VRCNUM",
          values: ["12345"],
        },
        {
          field: "DOB",
          values: ["1990-01-01T00:00:00Z"],
        },
      ];

      render(
        <SearchQueryDisplay {...defaultProps} searchQuery={searchQuery} />,
      );

      expect(screen.getByText("Current Search Query")).toBeInTheDocument();
      expect(screen.getByText("Voter ID:")).toBeInTheDocument();
      expect(screen.getByText("12345")).toBeInTheDocument();
      expect(screen.getByText("Date of Birth:")).toBeInTheDocument();
    });

    it("renders multiple value fields with OR logic", () => {
      const searchQuery: SearchQueryField[] = [
        {
          field: "VRCNUM",
          values: ["12345", "67890", "11111"],
        },
      ];

      render(
        <SearchQueryDisplay {...defaultProps} searchQuery={searchQuery} />,
      );

      expect(screen.getByText("Voter ID:")).toBeInTheDocument();
      expect(screen.getByText("(Any of the following):")).toBeInTheDocument();
      expect(screen.getByText("12345")).toBeInTheDocument();
      expect(screen.getByText("67890")).toBeInTheDocument();
      expect(screen.getByText("11111")).toBeInTheDocument();
    });

    it("formats date fields correctly", () => {
      const searchQuery: SearchQueryField[] = [
        {
          field: "DOB",
          values: ["1990-01-01T00:00:00Z"],
        },
      ];

      render(
        <SearchQueryDisplay {...defaultProps} searchQuery={searchQuery} />,
      );

      expect(screen.getByText("Date of Birth:")).toBeInTheDocument();
      expect(screen.getByText("12/31/1989")).toBeInTheDocument();
    });
  });

  describe("record count and export limits", () => {
    it("shows record count when records are found", () => {
      const searchQuery: SearchQueryField[] = [
        {
          field: "VRCNUM",
          values: ["12345"],
        },
      ];

      render(
        <SearchQueryDisplay
          {...defaultProps}
          searchQuery={searchQuery}
          totalRecords={1500}
        />,
      );

      expect(screen.getByText("Found 1,500 records")).toBeInTheDocument();
    });

    it("shows export limit warning when records exceed limit", () => {
      const searchQuery: SearchQueryField[] = [
        {
          field: "VRCNUM",
          values: ["12345"],
        },
      ];

      render(
        <SearchQueryDisplay
          {...defaultProps}
          searchQuery={searchQuery}
          totalRecords={1500}
          maxRecordsForExport={1000}
        />,
      );

      expect(
        screen.getByText(/exceeds export limit of 1,000/),
      ).toBeInTheDocument();
      expect(screen.getByText("Large Export Request")).toBeInTheDocument();
      expect(screen.getByText("Contact admin@example.com")).toBeInTheDocument();
    });
  });

  describe("clear search functionality", () => {
    it("calls onClearSearch when clear button is clicked", () => {
      const searchQuery: SearchQueryField[] = [
        {
          field: "VRCNUM",
          values: ["12345"],
        },
      ];

      render(
        <SearchQueryDisplay {...defaultProps} searchQuery={searchQuery} />,
      );

      const clearButton = screen.getByText("Clear Search");
      fireEvent.click(clearButton);

      expect(mockOnClearSearch).toHaveBeenCalledTimes(1);
    });
  });
});
