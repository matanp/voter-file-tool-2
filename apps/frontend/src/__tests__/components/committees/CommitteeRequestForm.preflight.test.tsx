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

const toastMock = jest.fn();
jest.mock("~/components/ui/use-toast", () => ({
  toast: (props: unknown): void => {
    toastMock(props);
  },
}));

import CommitteeRequestForm from "~/app/committees/CommitteeRequestForm";

describe("CommitteeRequestForm preflight", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
    toastMock.mockReset();
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
    expect(
      screen.getByText("Committee is at capacity (no open seats)."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("If you believe this is an exception, contact MCDC staff."),
    ).toBeInTheDocument();
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

  it("renders all API hard-stop reasons and escalation guidance when submit fails", async () => {
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
            mockJsonResponse(
              {
                success: false,
                error: "INELIGIBLE",
                reasons: ["CAPACITY", "PARTY_MISMATCH"],
              },
              { status: 422 },
            ),
          );
        }

        throw new Error(`Unexpected fetch call: ${method} ${url}`);
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();

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
      expect(submitButton).toBeEnabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Committee is at capacity (no open seats)."),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Party does not match the required party for this committee.",
        ),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled();
    });
    const blockedToast = toastMock.mock.calls
      .map(([args]) => args as { title?: string; description?: string })
      .find((args) => args.title === "Submission blocked");

    expect(blockedToast).toBeDefined();
    expect(blockedToast?.description).toContain(
      "If you believe this is an exception, contact MCDC staff.",
    );
  });

  it("falls back to deterministic message when API omits reasons array", async () => {
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
            mockJsonResponse(
              {
                success: false,
                error: "INELIGIBLE",
              },
              { status: 422 },
            ),
          );
        }

        throw new Error(`Unexpected fetch call: ${method} ${url}`);
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();

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
      expect(submitButton).toBeEnabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Submission failed eligibility checks."),
      ).toBeInTheDocument();
    });
  });
});
