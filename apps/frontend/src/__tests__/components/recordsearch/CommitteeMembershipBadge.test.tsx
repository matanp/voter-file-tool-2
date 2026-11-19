/**
 * Record search committee badge (ticket 08): a voter with `activeCommittee`
 * shows "Committee: TOWN · LD n · ED n" in the table row, the phone card, and
 * the details views — only when the page asks for it (acting role Leader or
 * up). The server decides who receives the field; these views only render it.
 */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { VoterRecordTable } from "~/app/recordsearch/VoterRecordTable";
import { VoterRecordCardList } from "~/app/recordsearch/VoterRecordCardList";
import { VoterCard } from "~/app/recordsearch/VoterCard";
import { CommitteeMembershipBadge } from "~/app/recordsearch/CommitteeMembershipBadge";
import { committeeLabel } from "~/lib/committees/committeeRef";
import {
  recordSearchCommitteeSpokenLabel,
  type RecordSearchResult,
} from "~/lib/recordSearch";
import { createMockVoterRecord } from "../../utils/testUtils";

const MEMBER: RecordSearchResult = {
  ...createMockVoterRecord({
    VRCNUM: "A1",
    firstName: "ALEX",
    lastName: "SAMPLE",
  }),
  activeCommittee: {
    committeeListId: 7,
    cityTown: "GREECE",
    legDistrict: 1,
    electionDistrict: 5,
  },
};
const NON_MEMBER: RecordSearchResult = createMockVoterRecord({
  VRCNUM: "A2",
  firstName: "BLAKE",
  lastName: "SAMPLE",
});
const RECORDS = [MEMBER, NON_MEMBER];
/** What a screen reader hears; the abbreviated parts are aria-hidden. */
const SPOKEN =
  "Committee member: GREECE, Legislative District 1, Election District 5";

function renderTable(showCommitteeMembership: boolean) {
  return render(
    <VoterRecordTable
      records={RECORDS}
      showCommitteeMembership={showCommitteeMembership}
      fieldsList={["DOB"]}
      paginated={true}
      totalRecords={2}
      loadMore={jest.fn()}
    />,
  );
}

function renderCards(showCommitteeMembership: boolean) {
  return render(
    <VoterRecordCardList
      records={RECORDS}
      showCommitteeMembership={showCommitteeMembership}
      fieldsList={["DOB"]}
      totalRecords={2}
      loadMore={jest.fn()}
    />,
  );
}

describe("committee labels", () => {
  it("names the town, LD and ED, leaving out LD for a town without one", () => {
    expect(committeeLabel(MEMBER.activeCommittee!)).toBe(
      "GREECE · LD 1 · ED 5",
    );
    expect(
      committeeLabel({
        committeeListId: 8,
        cityTown: "BRIGHTON",
        legDistrict: 0,
        electionDistrict: 12,
      }),
    ).toBe("BRIGHTON · ED 12");
  });

  it("spells the label out for screen readers, with the same LD rule", () => {
    expect(recordSearchCommitteeSpokenLabel(MEMBER.activeCommittee!)).toBe(
      SPOKEN,
    );
    expect(
      recordSearchCommitteeSpokenLabel({
        committeeListId: 8,
        cityTown: "BRIGHTON",
        legDistrict: 0,
        electionDistrict: 12,
      }),
    ).toBe("Committee member: BRIGHTON, Election District 12");
  });
});

describe("CommitteeMembershipBadge", () => {
  it("shows the abbreviated label to sighted users only and the spelled-out one to screen readers", () => {
    const { container } = render(
      <CommitteeMembershipBadge committee={MEMBER.activeCommittee!} />,
    );
    const visual = Array.from(
      container.querySelectorAll('[aria-hidden="true"]'),
    ).map((el) => el.textContent);
    expect(visual).toEqual(["Committee:", "GREECE ·", "LD 1 ·", "ED 5"]);
    expect(screen.getByText(SPOKEN)).toHaveClass("sr-only");
  });
});

describe("VoterRecordTable committee badge", () => {
  it("shows the badge in the member's row and their details, not in other rows", async () => {
    const user = userEvent.setup();
    renderTable(true);

    const [, memberRow, otherRow] = screen.getAllByRole("row");
    expect(within(memberRow!).getByText(SPOKEN)).toBeInTheDocument();
    expect(within(otherRow!).queryByText(/^Committee/)).not.toBeInTheDocument();

    await user.click(
      within(memberRow!).getByRole("button", { name: "See more details" }),
    );
    const details = screen.getByRole("dialog");
    expect(within(details).getByText(SPOKEN)).toBeInTheDocument();
  });

  it("hides the badge when the page doesn't ask for it", async () => {
    const user = userEvent.setup();
    renderTable(false);

    expect(screen.queryByText(/^Committee/)).not.toBeInTheDocument();
    const [, memberRow] = screen.getAllByRole("row");
    await user.click(
      within(memberRow!).getByRole("button", { name: "See more details" }),
    );
    expect(screen.queryByText(/^Committee/)).not.toBeInTheDocument();
  });
});

describe("VoterRecordCardList committee badge", () => {
  it("shows the badge on the member's card and in the details sheet", async () => {
    const user = userEvent.setup();
    renderCards(true);

    const [memberCard, otherCard] = within(
      screen.getByRole("list", { name: "Voter records" }),
    ).getAllByRole("listitem");
    expect(within(memberCard!).getByText(SPOKEN)).toBeInTheDocument();
    expect(
      within(otherCard!).queryByText(/^Committee/),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ALEX SAMPLE/ }));
    const sheet = screen.getByRole("dialog", { name: "Voter details" });
    expect(within(sheet).getByText(SPOKEN)).toBeInTheDocument();
  });

  it("hides the badge when the page doesn't ask for it", async () => {
    const user = userEvent.setup();
    renderCards(false);

    expect(screen.queryByText(/^Committee/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /ALEX SAMPLE/ }));
    expect(screen.queryByText(/^Committee/)).not.toBeInTheDocument();
  });
});

describe("VoterCard committee badge", () => {
  it("renders only with an activeCommittee", () => {
    const { rerender } = render(
      <VoterCard record={MEMBER} activeCommittee={MEMBER.activeCommittee} />,
    );
    expect(screen.getByText(SPOKEN)).toBeInTheDocument();
    rerender(<VoterCard record={MEMBER} />);
    expect(screen.queryByText(/^Committee/)).not.toBeInTheDocument();
  });
});
