import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EligibilityFlagReviewDialog } from "~/app/admin/eligibility-flags/EligibilityFlagReviewDialog";
import { mockJsonResponse } from "../../../utils/testUtils";

describe("EligibilityFlagReviewDialog", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue(
      mockJsonResponse({ status: "CONFIRMED" }),
    ) as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("submits confirm decision with notes", async () => {
    const onReviewed = jest.fn();
    const onOpenChange = jest.fn();
    const user = userEvent.setup();

    render(
      <EligibilityFlagReviewDialog
        open
        onOpenChange={onOpenChange}
        onReviewed={onReviewed}
        flag={{
          id: "flag-1",
          reason: "PARTY_MISMATCH",
          status: "PENDING",
          membership: {
            voterRecordId: "V1",
            voterRecord: {
              VRCNUM: "V1",
              firstName: "Jane",
              lastName: "Doe",
            },
            committeeList: {
              cityTown: "Rochester",
              legDistrict: 1,
              electionDistrict: 1,
            },
          },
        }}
      />,
    );

    await user.type(
      screen.getByLabelText("Notes (optional)"),
      "Verified by admin",
    );
    await user.click(screen.getByRole("button", { name: "Confirm removal" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const firstCall = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      { body?: string },
    ];
    expect(firstCall[0]).toBe("/api/admin/eligibility-flags/flag-1/review");
    expect(firstCall[1].body).toBe(
      JSON.stringify({
        decision: "confirm",
        notes: "Verified by admin",
      }),
    );

    await waitFor(() => {
      expect(onReviewed).toHaveBeenCalled();
    });
  });
});
