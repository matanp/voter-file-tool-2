/**
 * Admin requests page's reported exits: reuses the workspace Pending item, so
 * this covers only what the list adds — refreshing the server-rendered page
 * after a decision, and landing focus on the page heading, which survives the
 * refresh that removes the decided item.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ExitReportList } from "~/app/committees/requests/ExitReportList";
import { REQUESTS_HEADING_ID } from "~/app/committees/requests/requestsHeading";
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

const REPORTED_AT = "2026-10-30T15:04:05.678Z";

const REPORT: PendingExitReport = {
  membershipId: "m-rep",
  voterRecordId: "VR100",
  firstName: "Rita",
  lastName: "Reported",
  seatNumber: 3,
  kind: "REMOVAL",
  reportedAt: REPORTED_AT,
  isOwnReport: false,
  reportedBy: { id: "u-1", name: "Lee Leader" },
  removalReason: "DECEASED",
  removalNotes: null,
  resignationDateReceived: null,
  resignationMethod: null,
};

beforeEach(() => {
  mockRefresh.mockReset();
  mockToast.mockReset();
});

/**
 * Mirrors the requests page: the heading stays put, and the refresh drops the
 * decided report — here the committee's last, so its whole section goes.
 */
function RequestsPage({ initial }: { initial: PendingExitReport[] }) {
  const [reports, setReports] = React.useState(initial);
  mockRefresh.mockImplementation(() => setReports([]));
  return (
    <div>
      <h1 id={REQUESTS_HEADING_ID} tabIndex={-1}>
        Pending requests
      </h1>
      {reports.length > 0 && <ExitReportList reports={reports} />}
    </div>
  );
}

describe("ExitReportList", () => {
  it.each([
    [
      "Confirm removal of Rita Reported",
      "Confirm removal",
      "/api/committee/exitReport/confirm",
      "Confirmed the removal of Rita Reported.",
    ],
    [
      "Reject removal report for Rita Reported",
      "Yes, reject report",
      "/api/committee/exitReport/reject",
      "Rejected the exit report for Rita Reported.",
    ],
  ])(
    "decides through the modal (%s), refreshes the page, announces it, and lands focus on the page heading",
    async (trigger, action, url, announcement) => {
      const fetchMock = installFetchMock(async () =>
        fetchJsonResponse({ success: true }),
      );
      render(<RequestsPage initial={[REPORT]} />);

      await userEvent.click(screen.getByRole("button", { name: trigger }));
      const dialog = screen.getByRole("alertdialog");
      await userEvent.type(
        within(dialog).getByLabelText("Note (optional)"),
        "Checked",
      );
      await userEvent.click(
        within(dialog).getByRole("button", { name: action }),
      );

      await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
      expect(fetchMock).toHaveBeenCalledWith(
        url,
        expect.objectContaining({ method: "POST" }),
      );
      expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
        membershipId: "m-rep",
        exitReportedAt: REPORTED_AT,
        note: "Checked",
      });
      expect(mockToast).toHaveBeenCalledWith({ description: announcement });
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: "Pending requests" }),
        ).toHaveFocus(),
      );
    },
  );

  it("does not refresh when the decision fails", async () => {
    installFetchMock(async () =>
      fetchJsonResponse(
        { success: false, error: "This member changed, refresh." },
        409,
      ),
    );
    render(<RequestsPage initial={[REPORT]} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Confirm removal of Rita Reported" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm removal" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not confirm: This member changed, refresh.",
    );
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });
});
