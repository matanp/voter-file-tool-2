/**
 * Record search quick name box (leader feedback 2026-11-11 #06): a first/last name box above the
 * criteria builder that runs as part of the same search.
 */
import React from "react";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import VoterRecordSearch from "~/app/recordsearch/VoterRecordSearch";
import {
  createMockVoterRecordSearchProps,
  renderWithVoterSearchProvider,
  cleanupMocks,
} from "~/__tests__/utils/searchTestUtils";
import type { SearchField } from "~/types/searchFields";

const nameValues = (rows: SearchField[]) => {
  const row = rows.find((r) => r.compoundType && r.name === "name");
  if (!row?.compoundType) return {};
  return Object.fromEntries(row.fields.map((f) => [f.name, f.value]));
};

describe("Record search quick name box", () => {
  beforeEach(() => cleanupMocks());

  it("searches the typed name with one Submit, no chip step", async () => {
    const user = userEvent.setup();
    const handleSubmit = jest
      .fn<Promise<void>, [SearchField[]]>()
      .mockResolvedValue(undefined);
    renderWithVoterSearchProvider(
      <VoterRecordSearch
        {...createMockVoterRecordSearchProps({ handleSubmit })}
      />,
    );

    await user.type(screen.getByLabelText("First name"), "John");
    await user.type(screen.getByLabelText("Last name"), "Smith");
    await user.click(screen.getByRole("button", { name: /Submit/i }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    const rows = handleSubmit.mock.calls[0]![0];
    expect(rows.filter((r) => r.name === "name")).toHaveLength(1);
    expect(nameValues(rows)).toEqual({
      firstName: ["John"],
      lastName: ["Smith"],
    });
  });

  it("submits on Enter from the name box", async () => {
    const user = userEvent.setup();
    const handleSubmit = jest
      .fn<Promise<void>, [SearchField[]]>()
      .mockResolvedValue(undefined);
    renderWithVoterSearchProvider(
      <VoterRecordSearch
        {...createMockVoterRecordSearchProps({ handleSubmit })}
      />,
    );

    await user.type(screen.getByLabelText("Last name"), "Smith{Enter}");

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(nameValues(handleSubmit.mock.calls[0]![0])).toEqual({
      lastName: ["Smith"],
    });
  });

  it("combines with the criteria builder into one search", async () => {
    const user = userEvent.setup();
    const handleSubmit = jest
      .fn<Promise<void>, [SearchField[]]>()
      .mockResolvedValue(undefined);
    renderWithVoterSearchProvider(
      <VoterRecordSearch
        {...createMockVoterRecordSearchProps({ handleSubmit })}
      />,
    );

    // Quick box: last name. Builder's Name row: first name.
    await user.type(screen.getByLabelText("Last name"), "Smith");
    const builder = screen.getByRole("group", { name: "Search criteria" });
    await user.type(
      within(builder).getByPlaceholderText("Enter First Name(s)"),
      "Jane",
    );
    await user.click(screen.getByRole("button", { name: /Submit/i }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    const rows = handleSubmit.mock.calls[0]![0];
    expect(rows.filter((r) => r.name === "name")).toHaveLength(1);
    expect(nameValues(rows)).toEqual({
      firstName: ["Jane"],
      lastName: ["Smith"],
    });
  });

  it("still runs a builder-only search when the name box is empty", async () => {
    const user = userEvent.setup();
    const handleSubmit = jest
      .fn<Promise<void>, [SearchField[]]>()
      .mockResolvedValue(undefined);
    renderWithVoterSearchProvider(
      <VoterRecordSearch
        {...createMockVoterRecordSearchProps({ handleSubmit })}
      />,
    );

    await user.type(screen.getByPlaceholderText("Enter First Name(s)"), "Jane");
    await user.click(screen.getByRole("button", { name: /Submit/i }));

    expect(nameValues(handleSubmit.mock.calls[0]![0])).toEqual({
      firstName: ["Jane"],
    });
  });
});
