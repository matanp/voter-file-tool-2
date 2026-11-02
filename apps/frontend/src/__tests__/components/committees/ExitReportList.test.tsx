/**
 * Admin requests page's reported exits: reuses the workspace Pending item, so
 * this covers only what the list adds — refreshing the server-rendered page
 * after a decision, and keeping focus in place while it does.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ExitReportList } from "~/app/committees/requests/ExitReportList";
import type { PendingExitReport } from "~/lib/validations/committee";
import { installFetchMock } from "../../utils/mocks";

const mockRefresh = jest.fn();
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

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    headers: { get: () => "application/json" },
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => mockRefresh.mockClear());

describe("ExitReportList", () => {
  it.each([
    [
      "Confirm removal of Rita Reported",
      "Confirm removal",
      "/api/committee/exitReport/confirm",
      "Confirmed. Updating…",
    ],
    [
      "Reject removal report for Rita Reported",
      "Yes, reject report",
      "/api/committee/exitReport/reject",
      "Rejected. Updating…",
    ],
  ])(
    "decides through the modal (%s), refreshes the page, and keeps focus on the item",
    async (trigger, action, url, line) => {
      const fetchMock = installFetchMock(async () =>
        jsonResponse({ success: true }),
      );
      render(<ExitReportList reports={[REPORT]} />);

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
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByText(line)).toHaveFocus());
    },
  );

  it("does not refresh when the decision fails", async () => {
    installFetchMock(async () =>
      jsonResponse(
        { success: false, error: "This member changed, refresh." },
        409,
      ),
    );
    render(<ExitReportList reports={[REPORT]} />);

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
  });
});
