import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CommitteeTerm } from "@prisma/client";
import { TermsManagement } from "~/app/admin/terms/TermsManagement";
import { MissingCommittees } from "~/app/admin/terms/MissingCommittees";
import { mockJsonResponse } from "../../../utils/testUtils";

jest.mock("~/components/ui/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const term = (id: string, isActive: boolean): CommitteeTerm => ({
  id,
  label: id,
  isActive,
  startDate: new Date("2026-01-01"),
  endDate: new Date("2028-01-01"),
  createdAt: new Date("2026-01-01"),
});
const preview = (termId: string, missing = false) => ({
  termId,
  termLabel: termId,
  unknownTownCodes: [],
  missing: missing
    ? [
        {
          cityTown: "GREECE",
          legDistrict: 5,
          electionDistrict: 7,
          voterCount: 1,
        },
      ]
    : [],
});

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

it("reloads a completed old-term preview after activating a different term", async () => {
  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce(mockJsonResponse(preview("old-term")))
    .mockResolvedValueOnce(mockJsonResponse({ success: true }))
    .mockResolvedValueOnce(
      mockJsonResponse([term("old-term", false), term("new-term", true)]),
    )
    .mockResolvedValueOnce(mockJsonResponse(preview("new-term", true)))
    .mockResolvedValueOnce(
      mockJsonResponse({
        success: true,
        committeesCreated: 1,
        seatsCreated: 4,
      }),
    )
    .mockResolvedValueOnce(mockJsonResponse(preview("new-term")));
  globalThis.fetch = fetchMock;
  render(
    <TermsManagement
      initialTerms={[term("old-term", true), term("new-term", false)]}
    />,
  );
  await screen.findByText(/Every election district/);
  expect(
    screen.queryByRole("button", { name: "Create 1 committees" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Set Active" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Create 1 committees" }),
  );
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/committees/missing",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ termId: "new-term" }),
      }),
    ),
  );
  await screen.findByText(/Every election district/);
});

it("refreshes a stale preview after the server rejects its term", async () => {
  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce(mockJsonResponse(preview("old-term", true)))
    .mockResolvedValueOnce(
      mockJsonResponse({ error: "The active term changed" }, { status: 409 }),
    )
    .mockResolvedValueOnce(mockJsonResponse(preview("new-term")));
  globalThis.fetch = fetchMock;
  render(<MissingCommittees />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Create 1 committees" }),
  );
  await screen.findByText(/Every election district/);
  expect(screen.getByText("new-term")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    "/api/admin/committees/missing",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ termId: "old-term" }),
    }),
  );
});
