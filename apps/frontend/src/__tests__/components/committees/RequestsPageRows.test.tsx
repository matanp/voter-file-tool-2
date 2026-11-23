/**
 * Admin requests page rows: a submission (RequestRow) and an Exit Report
 * (PendingExitReportItem with layout="row") share one compact row. Decisions
 * through the Exit Report row are covered by ExitReportList.test.tsx.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { MembershipRequestWithDetails } from "~/app/committees/requests/page";
import { RequestRow } from "~/app/committees/requests/RequestRow";
import { PendingExitReportItem } from "~/app/committees/workspace/tabs/pending/PendingExitReportItem";
import type { PendingExitReport } from "~/lib/validations/committee";
import { fetchJsonResponse, installFetchMock } from "../../utils/mocks";

const mockRefresh = jest.fn();
const mockToast = jest.fn();
jest.mock("~/components/ui/use-toast", () => ({
  toast: (...args: unknown[]): unknown => mockToast(...args),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const REQUEST = {
  id: "m-sub",
  committeeListId: 7,
  voterRecord: { firstName: "Alex", lastName: "Sample" },
  submissionMetadata: null,
  seatNumber: null,
  submittedAt: new Date("2026-11-18T15:00:00.000Z"),
} satisfies MembershipRequestWithDetails;

const REPORT: PendingExitReport = {
  letter: null,
  membershipId: "m-rep",
  voterRecordId: "TEST000002",
  firstName: "Jordan",
  lastName: "Example",
  seatNumber: 3,
  kind: "REMOVAL",
  reportedAt: "2026-11-14T15:04:05.678Z",
  isOwnReport: false,
  reportedBy: { id: "u-1", name: "Pat Leader" },
  removalReason: null,
  removalNotes: "Moved out of the district",
  resignationDateReceived: null,
  resignationMethod: null,
};

function renderInList(row: React.ReactElement) {
  return render(<ul>{row}</ul>);
}

beforeEach(() => {
  mockRefresh.mockReset();
  mockToast.mockReset();
});

describe("RequestRow", () => {
  it("shows the candidate, kind and date without filler when there are no notes", () => {
    renderInList(<RequestRow request={REQUEST} />);

    const row = screen.getByRole("listitem", { name: "Alex Sample" });
    expect(within(row).getByText("Submission")).toBeInTheDocument();
    expect(within(row).getByText(/^Submitted /)).toBeInTheDocument();
    expect(within(row).queryByText(/Seat/)).not.toBeInTheDocument();
    expect(within(row).queryByText(/No notes/)).not.toBeInTheDocument();
    expect(
      within(row).getByRole("link", { name: "Confirm in Meetings" }),
    ).toHaveAttribute("href", "/admin/meetings");
  });

  it("shows notes, the replacement target and eligibility warnings as an alert", () => {
    renderInList(
      <RequestRow
        request={{
          ...REQUEST,
          seatNumber: 2,
          submissionMetadata: {
            requestNotes: "Recommended by the district leader",
            removeMemberId: "TEST000003",
            eligibilityWarnings: [
              { code: "PARTY_MISMATCH", message: "Party does not match" },
            ],
          },
        }}
      />,
    );

    const row = screen.getByRole("listitem", { name: "Alex Sample · Seat 2" });
    expect(
      within(row).getByText("Recommended by the district leader"),
    ).toBeInTheDocument();
    expect(
      within(row).getByText("Intended replacement for member ID: TEST000003"),
    ).toBeInTheDocument();
    const alert = within(row).getByRole("alert");
    expect(alert).toHaveTextContent("Eligibility warnings");
    expect(alert).toHaveTextContent("Party does not match");
  });

  it("rejects through handleRequest and refreshes the page", async () => {
    const fetchMock = installFetchMock(async () =>
      fetchJsonResponse({ success: true, message: "Request rejected" }),
    );
    renderInList(<RequestRow request={REQUEST} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Reject Alex Sample" }),
    );

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/committee/handleRequest",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      membershipId: "m-sub",
      acceptOrReject: "reject",
    });
    expect(mockToast).toHaveBeenCalledWith({
      title: "Success",
      description: "Request rejected",
    });
  });
});

describe("PendingExitReportItem layout='row'", () => {
  it("renders the compact row with the seat, kind chip, Admin context and controls", () => {
    renderInList(
      <PendingExitReportItem
        report={REPORT}
        canDecide
        layout="row"
        onDecided={jest.fn()}
      />,
    );

    const row = screen.getByRole("listitem", {
      name: "Jordan Example · Seat 3",
    });
    expect(row).not.toHaveClass("rounded-md");
    expect(within(row).getByText("Removal")).toBeInTheDocument();
    expect(
      within(row).getByText(/^Reported .* by Pat Leader$/),
    ).toBeInTheDocument();
    expect(
      within(row).getByText("Moved out of the district"),
    ).toBeInTheDocument();
    expect(
      within(row).getByRole("button", {
        name: "Confirm removal of Jordan Example",
      }),
    ).toBeInTheDocument();
    expect(
      within(row).getByRole("button", {
        name: "Reject removal report for Jordan Example",
      }),
    ).toBeInTheDocument();
  });

  it("hides the controls without canDecide", () => {
    renderInList(
      <PendingExitReportItem
        report={REPORT}
        canDecide={false}
        layout="row"
        onDecided={jest.fn()}
      />,
    );

    const row = screen.getByRole("listitem", {
      name: "Jordan Example · Seat 3",
    });
    expect(within(row).queryByRole("button")).not.toBeInTheDocument();
    expect(
      within(row).queryByText("Moved out of the district"),
    ).not.toBeInTheDocument();
  });
});
