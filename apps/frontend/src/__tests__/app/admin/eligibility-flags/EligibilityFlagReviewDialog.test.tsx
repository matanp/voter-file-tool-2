import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  EligibilityFlagReviewDialog,
  type EligibilityFlagListItem,
} from "~/app/admin/eligibility-flags/EligibilityFlagReviewDialog";
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
              party: "REP",
              stateAssmblyDistrict: "136",
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

  describe("discrepancy summary", () => {
    const buildFlag = (
      overrides: Partial<EligibilityFlagListItem>,
    ): EligibilityFlagListItem => ({
      id: "flag-2",
      reason: "ASSEMBLY_DISTRICT_MISMATCH",
      status: "PENDING",
      membership: {
        voterRecordId: "V2",
        voterRecord: {
          VRCNUM: "V2",
          firstName: "Bradley",
          lastName: "Lewis",
          party: "DEM",
          stateAssmblyDistrict: "135",
        },
        committeeList: {
          cityTown: "Rochester",
          legDistrict: 1,
          electionDistrict: 4,
        },
      },
      ...overrides,
    });

    const renderDialog = (flag: EligibilityFlagListItem) =>
      render(
        <EligibilityFlagReviewDialog
          open
          onOpenChange={jest.fn()}
          onReviewed={jest.fn()}
          flag={flag}
        />,
      );

    it("shows the committee AD and the voter's AD", () => {
      renderDialog(
        buildFlag({
          details: {
            expectedAssemblyDistrict: "136",
            voterAssemblyDistrict: "135",
          },
        }),
      );

      expect(
        screen.getByText("Committee AD: 136 · Voter's AD: 135"),
      ).toBeInTheDocument();
    });

    it("says the committee AD is unknown when there is no crosswalk row", () => {
      renderDialog(
        buildFlag({
          details: {
            expectedAssemblyDistrict: null,
            voterAssemblyDistrict: "135",
          },
        }),
      );

      expect(
        screen.getByText(
          "Committee AD: unknown (no crosswalk row) · Voter's AD: 135",
        ),
      ).toBeInTheDocument();
    });

    it("falls back to the voter record when details are missing", () => {
      renderDialog(buildFlag({ details: null }));

      expect(
        screen.getByText("Committee AD: not recorded · Voter's AD: 135"),
      ).toBeInTheDocument();
    });

    it("shows expected and actual party", () => {
      renderDialog(
        buildFlag({
          reason: "PARTY_MISMATCH",
          details: { expectedPartyCode: "REP", voterPartyCode: "DEM" },
        }),
      );

      expect(
        screen.getByText("Required party: REP · Voter's party: DEM"),
      ).toBeInTheDocument();
    });

    it("shows the voter's import version against the most recent import", () => {
      renderDialog(
        buildFlag({
          reason: "POSSIBLY_INACTIVE",
          details: {
            voterVersion: { year: 2025, recordEntryNumber: 3 },
            mostRecentImport: { year: 2026, recordEntryNumber: 1 },
          },
        }),
      );

      expect(
        screen.getByText(
          "Voter's latest import: 2025 #3 · Most recent import: 2026 #1",
        ),
      ).toBeInTheDocument();
    });

    it.each([
      ["a string", "garbage"],
      ["an array", [1, 2]],
      ["wrong field types", { voterVersion: "2025", mostRecentImport: 7 }],
    ])("opens without crashing when details are %s", (_label, details) => {
      renderDialog(buildFlag({ reason: "POSSIBLY_INACTIVE", details }));

      expect(
        screen.getByText(
          "Voter's latest import: unknown · Most recent import: unknown",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Confirm removal" }),
      ).toBeEnabled();
    });

    it("falls back to the voter record party when party details are malformed", () => {
      renderDialog(buildFlag({ reason: "PARTY_MISMATCH", details: "garbage" }));

      expect(
        screen.getByText("Required party: not recorded · Voter's party: DEM"),
      ).toBeInTheDocument();
    });
  });
});
