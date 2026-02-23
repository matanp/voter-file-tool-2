import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockVoterRecord, mockJsonResponse } from "../../utils/testUtils";

jest.mock("~/app/recordsearch/VoterRecordTable", () => ({
  VoterRecordTable: () => null,
}));

jest.mock("~/app/components/RecordSearchForm", () => ({
  __esModule: true,
  default: () => null,
}));

import CommitteeRequestForm from "~/app/committees/CommitteeRequestForm";

describe("CommitteeRequestForm preflight", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("blocks submit when preflight returns hard stops", async () => {
    const preflightHardStop = {
      eligible: false,
      hardStops: ["CAPACITY"],
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
        },
        committee: {
          activeMemberCount: 4,
          maxSeatsPerLted: 4,
        },
        warningState: "NONE",
      },
    };

    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/committee/eligibility?")) {
        return Promise.resolve(mockJsonResponse(preflightHardStop));
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <CommitteeRequestForm
        city="Test City"
        legDistrict="1"
        electionDistrict={1}
        committeeListId={1}
        defaultOpen={true}
        onOpenChange={() => undefined}
        committeeList={[]}
        onSubmit={() => undefined}
        addMember={createMockVoterRecord()}
      />,
    );

    const submitButton = screen.getByRole("button", { name: "Submit Request" });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/committee/eligibility?"),
        expect.objectContaining({ method: "GET" }),
      );
    });

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    expect(screen.getByText("Submission blocked")).toBeInTheDocument();
  });

  it("allows submit after preflight pass and posts request", async () => {
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
        },
        committee: {
          activeMemberCount: 1,
          maxSeatsPerLted: 4,
        },
        warningState: "NONE",
      },
    };

    const fetchMock = jest.fn(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (method === "GET" && url.startsWith("/api/committee/eligibility?")) {
          return Promise.resolve(mockJsonResponse(preflightPass));
        }

        if (method === "POST" && url === "/api/committee/requestAdd") {
          return Promise.resolve(
            mockJsonResponse({ success: true, message: "Request created" }),
          );
        }

        throw new Error(`Unexpected fetch call: ${method} ${url}`);
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(
      <CommitteeRequestForm
        city="Test City"
        legDistrict="1"
        electionDistrict={1}
        committeeListId={1}
        defaultOpen={true}
        onOpenChange={() => undefined}
        committeeList={[]}
        onSubmit={onSubmit}
        addMember={createMockVoterRecord()}
      />,
    );

    const submitButton = screen.getByRole("button", { name: "Submit Request" });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/committee/requestAdd",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
