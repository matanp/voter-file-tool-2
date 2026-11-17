/**
 * Record search quick name box (leader feedback 2026-11-11 #06): a first/last name box above the
 * criteria builder that runs as part of the same search. Also covers one-Submit searches from the
 * builder's own name inputs, whose typed text only becomes a chip on blur.
 */
import React from "react";
import { screen, waitFor, within } from "@testing-library/react";
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

const nameValues = (rows: SearchField[]) => {
  const row = rows.find((r) => r.compoundType && r.name === "name");
  if (!row?.compoundType) return {};
  return Object.fromEntries(row.fields.map((f) => [f.name, f.value]));
};

const renderSearch = () => {
  const user = userEvent.setup();
  const handleSubmit = jest
    .fn<Promise<void>, [SearchField[]]>()
    .mockResolvedValue(undefined);
  renderWithVoterSearchProvider(
    <VoterRecordSearch
      {...createMockVoterRecordSearchProps({ handleSubmit })}
    />,
  );
  const submittedRows = () => firstCallArg<SearchField[]>(handleSubmit);
  const builder = () => screen.getByRole("group", { name: "Search criteria" });
  return { user, handleSubmit, submittedRows, builder };
};

describe("Record search quick name box", () => {
  beforeEach(() => cleanupMocks());

  it("searches the typed name with one Submit, no chip step", async () => {
    const { user, handleSubmit, submittedRows } = renderSearch();

    await user.type(screen.getByLabelText("First name"), "John");
    await user.type(screen.getByLabelText("Last name"), "Smith");
    await user.click(screen.getByRole("button", { name: /Submit/i }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(submittedRows().filter((r) => r.name === "name")).toHaveLength(1);
    expect(nameValues(submittedRows())).toEqual({
      firstName: ["John"],
      lastName: ["Smith"],
    });
  });

  it("submits on Enter from the name box", async () => {
    const { user, handleSubmit, submittedRows } = renderSearch();

    await user.type(screen.getByLabelText("Last name"), "Smith{Enter}");

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(nameValues(submittedRows())).toEqual({ lastName: ["Smith"] });
  });

  it("combines with the criteria builder into one search", async () => {
    const { user, handleSubmit, submittedRows, builder } = renderSearch();

    // Quick box: last name. Builder's Name row: first name.
    await user.type(screen.getByLabelText("Last name"), "Smith");
    await user.type(
      within(builder()).getByPlaceholderText("Enter First Name(s)"),
      "Jane",
    );
    await user.click(screen.getByRole("button", { name: /Submit/i }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));
    expect(submittedRows().filter((r) => r.name === "name")).toHaveLength(1);
    expect(nameValues(submittedRows())).toEqual({
      firstName: ["Jane"],
      lastName: ["Smith"],
    });
  });

  it("narrows to the name box's first name when the builder has a different one", async () => {
    const { user, handleSubmit, submittedRows, builder } = renderSearch();

    await user.type(
      within(builder()).getByPlaceholderText("Enter First Name(s)"),
      "Jane{Enter}",
    );
    await user.type(screen.getByLabelText("First name"), "John");
    await user.click(screen.getByRole("button", { name: /Submit/i }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(nameValues(submittedRows())).toEqual({ firstName: ["John"] });
  });
});

describe("Record search criteria builder, one Submit", () => {
  beforeEach(() => cleanupMocks());

  it("searches text still typed in a builder input", async () => {
    const { user, handleSubmit, submittedRows, builder } = renderSearch();
    const input = within(builder()).getByPlaceholderText("Enter First Name(s)");

    await user.type(input, "Jane");
    await user.click(screen.getByRole("button", { name: /Submit/i }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));
    expect(nameValues(submittedRows())).toEqual({ firstName: ["Jane"] });
    // The typed text became a chip, so the input is empty for the next name.
    expect(input).toHaveValue("");
    expect(within(builder()).getByText("Jane")).toBeInTheDocument();
  });

  it("searches text still typed in a builder input on Ctrl+Enter", async () => {
    const { user, handleSubmit, submittedRows, builder } = renderSearch();

    await user.type(
      within(builder()).getByPlaceholderText("Enter Last Name(s)"),
      "Smith{Control>}{Enter}{/Control}",
    );

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));
    expect(nameValues(submittedRows())).toEqual({ lastName: ["Smith"] });
  });

  it("still submits when the typed text repeats an existing chip", async () => {
    const { user, handleSubmit, submittedRows, builder } = renderSearch();
    const input = within(builder()).getByPlaceholderText("Enter First Name(s)");

    await user.type(input, "Jane{Enter}");
    await user.type(input, "Jane");
    await user.click(screen.getByRole("button", { name: /Submit/i }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));
    expect(nameValues(submittedRows())).toEqual({ firstName: ["Jane"] });
  });
});
