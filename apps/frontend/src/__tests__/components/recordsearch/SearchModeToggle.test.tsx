/**
 * Record search simple/advanced toggle: simple mode is the name box alone, advanced adds the
 * criteria builder, and the browser remembers the last mode used.
 */
import React from "react";
import { screen, act, renderHook, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import VoterRecordSearch from "~/app/recordsearch/VoterRecordSearch";
import {
  createMockVoterRecordSearchProps,
  renderWithVoterSearchProvider,
  cleanupMocks,
} from "~/__tests__/utils/searchTestUtils";
import { firstCallArg } from "~/__tests__/utils/testUtils";
import type { SearchField } from "~/types/searchFields";
import {
  SEARCH_MODE_STORAGE_KEY,
  useSearchModePreference,
  type SearchMode,
} from "~/lib/useSearchModePreference";

const nameValues = (rows: SearchField[]) => {
  const row = rows.find((r) => r.compoundType && r.name === "name");
  if (!row?.compoundType) return {};
  return Object.fromEntries(row.fields.map((f) => [f.name, f.value]));
};

/** Renders the search with mode held in state, as RecordsList does. */
const renderWithMode = (initialMode: SearchMode) => {
  const user = userEvent.setup();
  const handleSubmit = jest
    .fn<Promise<void>, [SearchField[]]>()
    .mockResolvedValue(undefined);
  const Harness = () => {
    const [mode, setMode] = React.useState<SearchMode>(initialMode);
    return (
      <VoterRecordSearch
        {...createMockVoterRecordSearchProps({ handleSubmit })}
        mode={mode}
        onModeChange={setMode}
      />
    );
  };
  renderWithVoterSearchProvider(<Harness />);
  const submittedRows = () => firstCallArg<SearchField[]>(handleSubmit);
  return { user, handleSubmit, submittedRows };
};

const builder = () => screen.queryByRole("group", { name: "Search criteria" });

describe("Record search simple/advanced toggle", () => {
  beforeEach(() => {
    cleanupMocks();
    window.localStorage.clear();
  });

  it("shows only the name box and Search in simple mode", () => {
    renderWithMode("simple");

    expect(screen.getByLabelText("First name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last name")).toBeInTheDocument();
    expect(builder()).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Add another search criteria/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit/i })).toHaveTextContent(
      "Search",
    );
  });

  it("searches by the typed name in simple mode", async () => {
    const { user, handleSubmit, submittedRows } = renderWithMode("simple");

    await user.type(screen.getByLabelText("First name"), "John");
    await user.type(screen.getByLabelText("Last name"), "Smith{Enter}");

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(submittedRows()).toHaveLength(1);
    expect(nameValues(submittedRows())).toEqual({
      firstName: ["John"],
      lastName: ["Smith"],
    });
  });

  it("shows only the criteria builder in advanced mode", () => {
    renderWithMode("advanced");

    expect(builder()).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Search by name" }),
    ).not.toBeInTheDocument();
  });

  it("moves the typed name into the builder's Name row and back", async () => {
    const { user } = renderWithMode("simple");

    await user.type(screen.getByLabelText("First name"), "John");
    await user.type(screen.getByLabelText("Last name"), "Smith");
    await user.click(screen.getByRole("button", { name: "Advanced search →" }));

    const rows = builder()!;
    expect(within(rows).getByText("John")).toBeInTheDocument();
    expect(within(rows).getByText("Smith")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "← Simple search" }));
    expect(screen.getByLabelText("First name")).toHaveValue("John");
    expect(screen.getByLabelText("Last name")).toHaveValue("Smith");
  });

  it("clears a builder name that was emptied in simple mode", async () => {
    const { user } = renderWithMode("advanced");

    await user.type(
      within(builder()!).getByPlaceholderText("Enter First Name(s)"),
      "Jane{Enter}",
    );
    await user.click(screen.getByRole("button", { name: "← Simple search" }));
    expect(screen.getByLabelText("First name")).toHaveValue("Jane");

    await user.clear(screen.getByLabelText("First name"));
    await user.click(screen.getByRole("button", { name: "Advanced search →" }));
    expect(within(builder()!).queryByText("Jane")).not.toBeInTheDocument();
  });

  it("searches by the box alone in simple mode, keeping hidden builder criteria for advanced", async () => {
    const { user, handleSubmit, submittedRows } = renderWithMode("advanced");

    // Two first names in the builder: too many for the simple box to show.
    const firstNames = within(builder()!).getByPlaceholderText(
      "Enter First Name(s)",
    );
    await user.type(firstNames, "Jane{Enter}");
    await user.type(firstNames, "Ann{Enter}");
    await user.click(screen.getByRole("button", { name: "← Simple search" }));
    expect(screen.getByLabelText("First name")).toHaveValue("");

    await user.type(screen.getByLabelText("Last name"), "Smith");
    await user.click(screen.getByRole("button", { name: /Submit/i }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(submittedRows().map((r) => r.name)).toEqual(["name"]);
    expect(nameValues(submittedRows())).toEqual({ lastName: ["Smith"] });

    await user.click(screen.getByRole("button", { name: "Advanced search →" }));
    const rows = builder()!;
    expect(within(rows).getByText("Jane")).toBeInTheDocument();
    expect(within(rows).getByText("Ann")).toBeInTheDocument();
    expect(within(rows).getByText("Smith")).toBeInTheDocument();
  });
});

describe("useSearchModePreference", () => {
  beforeEach(() => window.localStorage.clear());

  it("defaults to simple", () => {
    const { result } = renderHook(() => useSearchModePreference());
    expect(result.current.mode).toBe("simple");
  });

  it("restores and saves the last mode", () => {
    window.localStorage.setItem(SEARCH_MODE_STORAGE_KEY, "advanced");
    const { result } = renderHook(() => useSearchModePreference());
    expect(result.current.mode).toBe("advanced");

    act(() => result.current.setMode("simple"));
    expect(result.current.mode).toBe("simple");
    expect(window.localStorage.getItem(SEARCH_MODE_STORAGE_KEY)).toBe("simple");
  });

  it("ignores an unrecognised stored value", () => {
    window.localStorage.setItem(SEARCH_MODE_STORAGE_KEY, "bogus");
    const { result } = renderHook(() => useSearchModePreference());
    expect(result.current.mode).toBe("simple");
  });

  it("still switches modes when storage throws", () => {
    const spy = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    const { result } = renderHook(() => useSearchModePreference());
    act(() => result.current.setMode("advanced"));
    expect(result.current.mode).toBe("advanced");
    spy.mockRestore();
  });
});
