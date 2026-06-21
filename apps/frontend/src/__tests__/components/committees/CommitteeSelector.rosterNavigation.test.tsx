import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel, type CommitteeList } from "@prisma/client";
import CommitteeSelector from "~/app/committees/CommitteeSelector";
import { mockHasPermission } from "../../utils/mocks";

jest.mock("~/components/providers/GlobalContext", () => ({
  GlobalContext: React.createContext({
    actingPermissions: PrivilegeLevel.Admin,
    setActingPermissions: () => undefined,
  }),
}));

jest.mock("~/components/ui/ComboBox", () => ({
  ComboboxDropdown: ({
    items,
    onSelect,
    displayLabel,
    initialValue,
  }: {
    items: Array<{ label: string; value: string }>;
    onSelect: (value: string) => void;
    displayLabel: string;
    initialValue?: string;
  }) => (
    <select
      aria-label={displayLabel}
      defaultValue={initialValue ?? ""}
      onChange={(e) => onSelect(e.target.value)}
    >
      <option value="">Select</option>
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  ),
}));

jest.mock("~/app/committees/AddCommitteeForm", () => ({
  AddCommitteeForm: () => <div data-testid="add-form" />,
}));

jest.mock("~/app/committees/CommitteeRequestForm", () => () => null);

jest.mock("~/app/recordsearch/RecordsList", () => ({
  VoterCard: () => <div data-testid="voter-card" />,
}));

jest.mock("~/app/committees/CommitteeSummaryBlock", () => ({
  CommitteeSummaryBlock: () => <div data-testid="summary-block" />,
}));

jest.mock("~/hooks/useApiMutation", () => ({
  useApiMutation: () => ({
    mutate: jest.fn(),
    loading: false,
  }),
}));

const greeceCommitteeLists = [
  {
    id: 1,
    cityTown: "GREECE",
    legDistrict: 1,
    electionDistrict: 5,
    termId: "term-1",
  },
  {
    id: 2,
    cityTown: "GREECE",
    legDistrict: 1,
    electionDistrict: 6,
    termId: "term-1",
  },
] as CommitteeList[];

const rochesterCommitteeLists = [
  {
    id: 10,
    cityTown: "ROCHESTER",
    legDistrict: 28,
    electionDistrict: 1,
    termId: "term-1",
  },
  {
    id: 11,
    cityTown: "ROCHESTER",
    legDistrict: 29,
    electionDistrict: 1,
    termId: "term-1",
  },
] as CommitteeList[];

function rosterResponse(cityTown: string, legDistrict?: number) {
  return {
    scope: { cityTown, ...(legDistrict !== undefined ? { legDistrict } : {}) },
    rows: [
      {
        committeeListId: 1,
        cityTown,
        legDistrict: legDistrict ?? 1,
        electionDistrict: 5,
        seatNumber: 1,
        isPetitioned: true,
        weight: "1.00",
        occupant: {
          VRCNUM: "V1",
          firstName: "Jane",
          lastName: "Doe",
          membershipType: "PETITIONED",
        },
      },
    ],
    edRollups: [
      {
        electionDistrict: 5,
        legDistrict: legDistrict ?? 1,
        filled: 1,
        totalSeats: 4,
        unassignedCount: 0,
        designationWeight: 1,
        missingWeightSeatNumbers: [],
      },
    ],
    summary: {
      totalSeats: 4,
      filled: 1,
      vacant: 3,
      edCount: 1,
      unassignedCount: 0,
    },
  };
}

function detailResponse(id: number) {
  return {
    id,
    memberships: [
      {
        voterRecord: {
          VRCNUM: "V1",
          firstName: "Jane",
          lastName: "Doe",
        },
        membershipType: "PETITIONED",
        seatNumber: 1,
      },
    ],
    maxSeatsPerLted: 4,
    ltedWeight: null,
    seats: [{ seatNumber: 1, isPetitioned: true, weight: 0.5 }],
    designationWeightSummary: null,
  };
}

describe("CommitteeSelector roster-first navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission(true);
  });

  it("auto-fetches roster when city scope is complete", async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/committee/roster/")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => rosterResponse("GREECE"),
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => [],
      } as unknown as Response;
    });
    global.fetch = fetchMock as jest.Mock;

    render(<CommitteeSelector committeeLists={greeceCommitteeLists} />);

    await userEvent.selectOptions(screen.getByLabelText("Select City"), "GREECE");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/committee/roster/?cityTown=GREECE"),
      );
    });
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Committee roster — GREECE" }),
    ).toBeInTheDocument();
  });

  it("does not fetch committee detail when only ED is selected", async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/committee/roster/")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => rosterResponse("GREECE"),
        } as unknown as Response;
      }
      if (url.startsWith("/api/fetchCommitteeList/")) {
        throw new Error("detail should not load yet");
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => [],
      } as unknown as Response;
    });
    global.fetch = fetchMock as jest.Mock;

    render(<CommitteeSelector committeeLists={greeceCommitteeLists} />);

    await userEvent.selectOptions(screen.getByLabelText("Select City"), "GREECE");
    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    await userEvent.selectOptions(
      screen.getByLabelText("Select Election District"),
      "5",
    );

    expect(screen.queryByTestId("voter-card")).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).startsWith("/api/fetchCommitteeList/"),
      ),
    ).toHaveLength(0);
  });

  it("loads detail panel when View committee details is clicked", async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/committee/roster/")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => rosterResponse("GREECE"),
        } as unknown as Response;
      }
      if (url.startsWith("/api/fetchCommitteeList/")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => detailResponse(1),
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => [],
      } as unknown as Response;
    });
    global.fetch = fetchMock as jest.Mock;

    render(<CommitteeSelector committeeLists={greeceCommitteeLists} />);

    await userEvent.selectOptions(screen.getByLabelText("Select City"), "GREECE");
    await userEvent.selectOptions(
      screen.getByLabelText("Select Election District"),
      "5",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "View committee details" }),
    );

    expect(await screen.findByTestId("voter-card")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Committee detail — GREECE · ED 5" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to full roster" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("legDistrict=1"),
    );
  });

  it("loads detail from roster View details button", async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/committee/roster/")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => rosterResponse("GREECE"),
        } as unknown as Response;
      }
      if (url.startsWith("/api/fetchCommitteeList/")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => detailResponse(1),
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => [],
      } as unknown as Response;
    });
    global.fetch = fetchMock as jest.Mock;

    render(<CommitteeSelector committeeLists={greeceCommitteeLists} />);

    await userEvent.selectOptions(screen.getByLabelText("Select City"), "GREECE");
    await userEvent.click(await screen.findByRole("button", { name: "View details" }));

    expect(await screen.findByTestId("voter-card")).toBeInTheDocument();
  });

  it("returns to cached roster without refetching when Back to full roster is clicked", async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/committee/roster/")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => rosterResponse("GREECE"),
        } as unknown as Response;
      }
      if (url.startsWith("/api/fetchCommitteeList/")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => detailResponse(1),
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => [],
      } as unknown as Response;
    });
    global.fetch = fetchMock as jest.Mock;

    render(<CommitteeSelector committeeLists={greeceCommitteeLists} />);

    await userEvent.selectOptions(screen.getByLabelText("Select City"), "GREECE");
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) =>
          String(url).startsWith("/api/committee/roster/"),
        ),
      ).toHaveLength(1);
    });

    await userEvent.click(await screen.findByRole("button", { name: "View details" }));
    await screen.findByTestId("voter-card");

    await userEvent.click(
      screen.getByRole("button", { name: "Back to full roster" }),
    );

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByTestId("voter-card")).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).startsWith("/api/committee/roster/"),
      ),
    ).toHaveLength(1);
  });

  it("waits for LD selection before fetching Rochester roster", async () => {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/committee/roster/")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => rosterResponse("ROCHESTER", 28),
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => [],
      } as unknown as Response;
    });
    global.fetch = fetchMock as jest.Mock;

    render(<CommitteeSelector committeeLists={rochesterCommitteeLists} />);

    await userEvent.selectOptions(
      screen.getByLabelText("Select City"),
      "ROCHESTER",
    );

    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).startsWith("/api/committee/roster/"),
      ),
    ).toHaveLength(0);

    await userEvent.selectOptions(
      screen.getByLabelText("Select Leg District"),
      "28",
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "/api/committee/roster/?cityTown=ROCHESTER&legDistrict=28",
        ),
      );
    });
  });
});
