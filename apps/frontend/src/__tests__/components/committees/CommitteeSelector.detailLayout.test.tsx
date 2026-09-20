import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel, type CommitteeList } from "@prisma/client";
import CommitteeSelector from "~/app/committees/CommitteeSelector";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { mockHasPermission } from "../../utils/mocks";

// Plain context (the real module pulls in next-auth); tests supply the acting
// role through the Provider.
jest.mock("~/components/providers/GlobalContext", () => ({
  GlobalContext: React.createContext({
    actingPermissions: PrivilegeLevel.ReadAccess,
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

// Stand-in exposes onAdd so the test can simulate a successful addition.
jest.mock("~/app/committees/AddCommitteeForm", () => ({
  AddCommitteeForm: ({
    onAdd,
  }: {
    onAdd: (city: string, district: number, legDistrict?: string) => void;
  }) => (
    <button
      type="button"
      data-testid="add-form"
      onClick={() => onAdd("GREECE", 5, "1")}
    >
      Simulate add
    </button>
  ),
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

jest.mock("~/hooks/useApiQuery", () => ({
  useApiQuery: () => ({ data: null, loading: false, error: null }),
}));

const greeceCommitteeLists = [
  {
    id: 1,
    cityTown: "GREECE",
    legDistrict: 1,
    electionDistrict: 5,
    termId: "term-1",
  },
] as CommitteeList[];

function rosterResponse() {
  return {
    scope: { cityTown: "GREECE" },
    rows: [
      {
        committeeListId: 1,
        cityTown: "GREECE",
        legDistrict: 1,
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
        legDistrict: 1,
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

function detailResponse() {
  return {
    id: 1,
    memberships: [
      {
        voterRecord: { VRCNUM: "V1", firstName: "Jane", lastName: "Doe" },
        membershipType: "PETITIONED",
        seatNumber: 1,
      },
    ],
    maxSeatsPerLted: 4,
    ltedWeight: null,
    seats: [{ seatNumber: 1, isPetitioned: true, weight: 0.5 }],
    designationWeightSummary: {
      totalWeight: 0.5,
      missingWeightSeatNumbers: [],
      seats: [
        {
          seatNumber: 1,
          isPetitioned: true,
          isOccupied: true,
          contributes: true,
          contributionWeight: 0.5,
          seatWeight: 0.5,
        },
      ],
    },
  };
}

function installFetch() {
  const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.startsWith("/api/committee/roster/")
      ? rosterResponse()
      : url.startsWith("/api/fetchCommitteeList/")
        ? detailResponse()
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

async function openDetail(acting: PrivilegeLevel) {
  render(
    <GlobalContext.Provider
      value={{ actingPermissions: acting, setActingPermissions: () => undefined }}
    >
      <CommitteeSelector committeeLists={greeceCommitteeLists} />
    </GlobalContext.Provider>,
  );
  await userEvent.selectOptions(screen.getByLabelText("Select City"), "GREECE");
  await userEvent.selectOptions(
    screen.getByLabelText("Select Election District"),
    "5",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "View committee details" }),
  );
  expect(await screen.findByTestId("voter-card")).toBeInTheDocument();
}

describe("CommitteeSelector detail interim layout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("titles the detail with the committee identity and leads with the summary", async () => {
    mockHasPermission(true);
    installFetch();
    await openDetail(PrivilegeLevel.Admin);

    const title = screen.getByRole("heading", { name: "GREECE · ED 5" });
    expect(title).toHaveClass("primary-header");
    expect(
      screen.queryByRole("heading", { name: /Committee detail/ }),
    ).not.toBeInTheDocument();

    // Summary precedes the add-member control in document order.
    const summary = screen.getByTestId("summary-block");
    const addButton = screen.getByRole("button", {
      name: "Add committee member",
    });
    expect(
      summary.compareDocumentPosition(addButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(screen.getByRole("heading", { name: "Members" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Committee settings" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("LTED total weight")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Petition outcomes" }),
    ).toBeInTheDocument();
  });

  it("keeps the add-member form closed until the disclosure is opened", async () => {
    mockHasPermission(true);
    installFetch();
    await openDetail(PrivilegeLevel.Admin);

    const addButton = screen.getByRole("button", {
      name: "Add committee member",
    });
    expect(addButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("add-form")).not.toBeVisible();

    await userEvent.click(addButton);
    expect(addButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("add-form")).toBeVisible();

    // Keyboard toggling closes it again.
    addButton.focus();
    await userEvent.keyboard("{Enter}");
    expect(addButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("add-form")).not.toBeVisible();
  });

  it("closes the disclosure and refreshes the committee after a successful add", async () => {
    mockHasPermission(true);
    const fetchMock = installFetch();
    await openDetail(PrivilegeLevel.Admin);

    const addButton = screen.getByRole("button", {
      name: "Add committee member",
    });
    await userEvent.click(addButton);
    const detailCallsBefore = fetchMock.mock.calls.filter(([url]) =>
      String(url).startsWith("/api/fetchCommitteeList/"),
    ).length;

    await userEvent.click(screen.getByTestId("add-form"));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) =>
          String(url).startsWith("/api/fetchCommitteeList/"),
        ).length,
      ).toBeGreaterThan(detailCallsBefore);
    });
    // The refresh re-renders the detail body, so re-query after it settles.
    expect(await screen.findByTestId("voter-card")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add committee member" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("add-form")).not.toBeVisible();
  });

  it("hides add-member and settings controls from ReadAccess users", async () => {
    mockHasPermission(false);
    installFetch();
    await openDetail(PrivilegeLevel.ReadAccess);

    expect(
      screen.queryByRole("button", { name: "Add committee member" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("add-form")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Committee settings" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("LTED total weight")).not.toBeInTheDocument();
  });

  it("shows the add-member disclosure but not settings to RequestAccess users", async () => {
    mockHasPermission(false);
    installFetch();
    await openDetail(PrivilegeLevel.RequestAccess);

    expect(
      screen.getByRole("button", { name: "Add committee member" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Committee settings" }),
    ).not.toBeInTheDocument();
  });
});
