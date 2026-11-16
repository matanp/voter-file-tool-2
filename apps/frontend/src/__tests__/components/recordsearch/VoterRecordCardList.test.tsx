/**
 * Record search results below md (leader feedback 2026-11-11 #06): one card per voter, tapping a
 * card opens the full VoterCard in a sheet.
 */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { VoterRecordCardList } from "~/app/recordsearch/VoterRecordCardList";
import { createMockVoterRecord } from "../../utils/testUtils";

const records = [
  createMockVoterRecord({
    VRCNUM: "A1",
    firstName: "JOHN",
    lastName: "SMITH",
    telephone: "585-555-0101",
    DOB: new Date("1970-05-04T12:00:00Z"),
  }),
  createMockVoterRecord({ VRCNUM: "A2", firstName: "JANE", lastName: "SMITH" }),
];

describe("VoterRecordCardList", () => {
  it("shows one card per voter with the table's fields", () => {
    render(
      <VoterRecordCardList
        records={records}
        fieldsList={["DOB", "telephone"]}
        totalRecords={2}
        loadMore={jest.fn()}
      />,
    );

    const cards = within(
      screen.getByRole("list", { name: "Voter records" }),
    ).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    const first = within(cards[0]!);
    expect(first.getByText("JOHN SMITH")).toBeInTheDocument();
    expect(first.getByText("DOB")).toBeInTheDocument();
    expect(
      first.getByText(new Date("1970-05-04T12:00:00Z").toLocaleDateString()),
    ).toBeInTheDocument();
    expect(first.getByText("Telephone")).toBeInTheDocument();
    expect(first.getByText("585-555-0101")).toBeInTheDocument();
    expect(
      screen.getByText("Showing 2 records of 2 total"),
    ).toBeInTheDocument();
  });

  it("opens the full voter details in a sheet when a card is tapped", async () => {
    const user = userEvent.setup();
    render(
      <VoterRecordCardList
        records={records}
        fieldsList={["DOB", "telephone"]}
        totalRecords={2}
        loadMore={jest.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /JANE SMITH/ }));

    const sheet = screen.getByRole("dialog", { name: "Voter details" });
    expect(
      within(sheet).getByRole("heading", { name: "JANE SMITH" }),
    ).toBeInTheDocument();
    expect(within(sheet).getByText("Voter Id:")).toBeInTheDocument();
    expect(within(sheet).getByText("A2", { exact: false })).toBeInTheDocument();

    await user.click(within(sheet).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers Load More only while records remain", async () => {
    const user = userEvent.setup();
    const loadMore = jest.fn();
    const { rerender } = render(
      <VoterRecordCardList
        records={records}
        fieldsList={["DOB"]}
        totalRecords={5}
        loadMore={loadMore}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Load More" }));
    expect(loadMore).toHaveBeenCalledTimes(1);

    rerender(
      <VoterRecordCardList
        records={records}
        fieldsList={["DOB"]}
        totalRecords={2}
        loadMore={loadMore}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Load More" }),
    ).not.toBeInTheDocument();
  });
});
