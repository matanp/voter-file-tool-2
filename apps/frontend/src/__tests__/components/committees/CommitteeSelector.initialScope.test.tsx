/**
 * Leaders who own exactly one committee land on its roster with no clicks;
 * everyone else still starts from the blank selector.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { PrivilegeLevel, type CommitteeList } from "@prisma/client";
import CommitteeSelector from "~/app/committees/CommitteeSelector";
import { singleCommitteeScope } from "~/app/committees/committeeScope";
import { mockHasPermission } from "../../utils/mocks";

jest.mock("~/components/providers/GlobalContext", () => ({
  GlobalContext: React.createContext({
    actingPermissions: PrivilegeLevel.Leader,
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
  useApiMutation: () => ({ mutate: jest.fn(), loading: false }),
}));

const greece = [
  { id: 1, cityTown: "GREECE", legDistrict: 1, electionDistrict: 5, termId: "t" },
  { id: 2, cityTown: "GREECE", legDistrict: 1, electionDistrict: 6, termId: "t" },
] as CommitteeList[];

const rochesterLd28 = [
  { id: 10, cityTown: "ROCHESTER", legDistrict: 28, electionDistrict: 1, termId: "t" },
  { id: 11, cityTown: "ROCHESTER", legDistrict: 28, electionDistrict: 2, termId: "t" },
] as CommitteeList[];

function rosterResponse(cityTown: string, legDistrict: number) {
  return {
    scope: { cityTown, legDistrict },
    rows: [
      {
        committeeListId: 1,
        cityTown,
        legDistrict,
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
        legDistrict,
        filled: 1,
        totalSeats: 4,
        unassignedCount: 0,
        designationWeight: 1,
        missingWeightSeatNumbers: [],
      },
    ],
    summary: { totalSeats: 4, filled: 1, vacant: 3, edCount: 1, unassignedCount: 0 },
  };
}

function installFetch(cityTown: string, legDistrict: number) {
  const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.startsWith("/api/committee/roster/")
      ? rosterResponse(cityTown, legDistrict)
      : url.startsWith("/api/user/jurisdictions")
        ? [{ cityTown, legDistrict }]
        : [];
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => body,
    } as unknown as Response;
  });
  global.fetch = fetchMock as jest.Mock;
  return fetchMock;
}

describe("singleCommitteeScope", () => {
  it("returns the scope when every list shares one city/LD", () => {
    expect(singleCommitteeScope(greece)).toEqual({ cityTown: "GREECE", legDistrict: 1 });
  });

  it("returns null for no lists or more than one scope", () => {
    expect(singleCommitteeScope([])).toBeNull();
    expect(singleCommitteeScope([...greece, ...rochesterLd28])).toBeNull();
    expect(
      singleCommitteeScope([
        rochesterLd28[0]!,
        { ...rochesterLd28[1]!, legDistrict: 29 },
      ]),
    ).toBeNull();
  });
});

describe("CommitteeSelector initialScope", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission(false);
  });

  it("opens straight on the town roster with no city picker", async () => {
    const fetchMock = installFetch("GREECE", 1);

    render(
      <CommitteeSelector
        committeeLists={greece}
        initialScope={{ cityTown: "GREECE", legDistrict: 1 }}
      />,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/committee/roster/?cityTown=GREECE"),
      );
    });
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByTestId("committee-scope")).toHaveTextContent("GREECE");
    expect(screen.queryByLabelText("Select City")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Committee roster — GREECE" }),
    ).toBeInTheDocument();
    // ED drill-down is still available from the roster.
    expect(screen.getByLabelText("Select Election District")).toBeInTheDocument();
  });

  it("includes the leg district for a Rochester scope", async () => {
    const fetchMock = installFetch("ROCHESTER", 28);

    render(
      <CommitteeSelector
        committeeLists={rochesterLd28}
        initialScope={{ cityTown: "ROCHESTER", legDistrict: 28 }}
      />,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "/api/committee/roster/?cityTown=ROCHESTER&legDistrict=28",
        ),
      );
    });
    expect(screen.getByTestId("committee-scope")).toHaveTextContent(
      "ROCHESTER · LD 28",
    );
    expect(screen.queryByLabelText("Select Leg District")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Committee roster — ROCHESTER · LD 28" }),
    ).toBeInTheDocument();
  });

  it("still shows the blank selector when no scope is given", () => {
    const fetchMock = installFetch("GREECE", 1);

    render(<CommitteeSelector committeeLists={greece} />);

    expect(screen.getByLabelText("Select City")).toBeInTheDocument();
    expect(screen.queryByTestId("committee-scope")).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).startsWith("/api/committee/roster/"),
      ),
    ).toHaveLength(0);
  });
});
