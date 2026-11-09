import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PendingExitReport } from "~/lib/validations/committee";
import { createMockVoterRecord } from "../../utils/testUtils";
import { fetchJsonResponse, installFetchMock } from "../../utils/mocks";

jest.mock("~/app/recordsearch/VoterRecordTable", () => ({
  VoterRecordTable: () => null,
}));

jest.mock("~/app/components/RecordSearchForm", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("~/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

import CommitteeRequestForm from "~/app/committees/CommitteeRequestForm";

const OUTGOING_ID = "OUT0000001";
const REPORTED_AT = "2026-11-01T12:34:56.789Z";

const preflightPass = {
  eligible: true,
  hardStops: [],
  warnings: [],
  snapshot: {
    voter: {
      voterRecordId: "TEST123456",
      name: "John Doe",
      homeCityTown: "Test City",
      homeElectionDistrict: 1,
      homeAssemblyDistrict: "1",
      party: "DEM",
    },
    lted: {
      cityTown: "Test City",
      legDistrict: 1,
      electionDistrict: 1,
      assemblyDistrict: "1",
    },
    committee: { activeMemberCount: 1, maxSeatsPerLted: 4 },
    warningState: "NONE",
  },
};

function pendingReportOn(voterRecordId: string): PendingExitReport {
  return {
    voterRecordId,
    firstName: "Out",
    lastName: "Going",
    membershipId: "membership-out",
    seatNumber: 1,
    kind: "RESIGNATION",
    reportedAt: REPORTED_AT,
    isOwnReport: true,
    replacement: null,
  } satisfies PendingExitReport;
}

/**
 * Renders a replacement of OUTGOING_ID, submits it, and returns the posted
 * requestAdd body. `pendingExitReports` is what the committee detail returns.
 */
async function submitReplacement(
  pendingExitReports: PendingExitReport[],
): Promise<Record<string, unknown>> {
  const fetchMock = installFetchMock((input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "GET" && url.startsWith("/api/committee/eligibility?")) {
      return Promise.resolve(fetchJsonResponse(preflightPass));
    }
    if (method === "GET" && url === "/api/committee/1/detail") {
      // Only the field the form reads; the rest of the detail is irrelevant.
      return Promise.resolve(fetchJsonResponse({ pendingExitReports }));
    }
    if (method === "POST" && url === "/api/committee/requestAdd") {
      return Promise.resolve(
        fetchJsonResponse({ success: true, message: "Request created" }),
      );
    }
    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  });

  render(
    <CommitteeRequestForm
      city="Test City"
      legDistrict="1"
      electionDistrict={1}
      committeeListId={1}
      defaultOpen={true}
      onOpenChange={() => undefined}
      committeeList={[createMockVoterRecord({ VRCNUM: OUTGOING_ID })]}
      onSubmit={() => undefined}
      addMember={createMockVoterRecord()}
      removeMember={createMockVoterRecord({ VRCNUM: OUTGOING_ID })}
    />,
  );

  const submitButton = screen.getByRole("button", { name: "Submit Request" });
  await waitFor(() => expect(submitButton).toBeEnabled());
  await userEvent.setup().click(submitButton);

  let body: Record<string, unknown> | undefined;
  await waitFor(() => {
    const call = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input) === "/api/committee/requestAdd" && init?.method === "POST",
    );
    expect(call).toBeDefined();
    body = JSON.parse(String(call?.[1]?.body)) as Record<string, unknown>;
  });
  return body ?? {};
}

describe("CommitteeRequestForm replacement", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("pairs with the outgoing member's pending Exit Report as reported", async () => {
    const body = await submitReplacement([
      pendingReportOn("SOMEONE_ELSE"),
      pendingReportOn(OUTGOING_ID),
    ]);

    expect(body).toMatchObject({
      removeMemberId: OUTGOING_ID,
      existingExitReportedAt: REPORTED_AT,
    });
    expect(body).not.toHaveProperty("exitReport");
  });

  it("files a removal (Other) when the outgoing member has no pending report", async () => {
    const body = await submitReplacement([pendingReportOn("SOMEONE_ELSE")]);

    expect(body).toMatchObject({
      removeMemberId: OUTGOING_ID,
      exitReport: {
        kind: "REMOVAL",
        removalReason: "OTHER",
        removalNotes: "Replacement request",
      },
    });
    expect(body).not.toHaveProperty("existingExitReportedAt");
  });
});
