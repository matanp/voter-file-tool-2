import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EligibilityFlagsTable } from "~/app/admin/eligibility-flags/EligibilityFlagsTable";
import { mockJsonResponse } from "../../../utils/testUtils";

describe("EligibilityFlagsTable", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("loads pending flags and completes confirm-removal review flow", async () => {
    const listResponses = [
      {
        flags: [
          {
            id: "flag-1",
            reason: "PARTY_MISMATCH",
            status: "PENDING",
            createdAt: "2026-02-20T00:00:00.000Z",
            reviewedAt: null,
            reviewedBy: null,
            membership: {
              voterRecordId: "V1",
              seatNumber: 1,
              term: { id: "term-1", label: "2026-2028" },
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
          },
        ],
      },
      { flags: [] },
    ];

    const fetchMock = jest.fn(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (
          method === "GET" &&
          url.startsWith("/api/admin/eligibility-flags?")
        ) {
          return Promise.resolve(
            mockJsonResponse(listResponses.shift() ?? { flags: [] }),
          );
        }

        if (
          method === "POST" &&
          url === "/api/admin/eligibility-flags/flag-1/review"
        ) {
          return Promise.resolve(mockJsonResponse({ status: "CONFIRMED" }));
        }

        throw new Error(`Unexpected fetch call: ${method} ${url}`);
      },
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();

    render(
      <EligibilityFlagsTable activeTermId="term-1" activeTermLabel="2026-2028" />,
    );

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/eligibility-flags?"),
    );
    expect(fetchMock.mock.calls[0]?.[0]).toContain("status=PENDING");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("termId=term-1");

    await user.click(screen.getByRole("button", { name: "Review" }));
    await user.click(screen.getByRole("button", { name: "Confirm removal" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/eligibility-flags/flag-1/review",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("No eligibility flags found.")).toBeInTheDocument();
    });
  });
});
