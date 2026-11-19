import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel } from "@prisma/client";
import CommitteeSelector from "~/app/committees/CommitteeSelector";
import {
  fetchJsonResponse,
  installFetchMock,
  mockHasPermission,
} from "../../utils/mocks";
import { createMockCommitteeListRow } from "../../utils/testUtils";

jest.mock("~/components/providers/GlobalContext", () => {
  return {
    GlobalContext: React.createContext({
      actingPermissions: PrivilegeLevel.Admin,
      setActingPermissions: () => undefined,
    }),
  };
});

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

jest.mock("~/app/recordsearch/VoterCard", () => ({
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

const emptyRoster = {
  scope: { cityTown: "BRIGHTON" },
  rows: [],
  edRollups: [],
  summary: {
    totalSeats: 0,
    filled: 0,
    vacant: 0,
    edCount: 0,
    unassignedCount: 0,
  },
};

// Seat 1: a directly-added PETITIONED member whose seat was never flagged.
// Seat 2: an APPOINTED member sitting in a seat flagged petitioned (winner left).
// Seat 3: vacant but flagged petitioned.
const committeeDetail = {
  id: 1,
  memberships: [
    {
      voterRecord: { VRCNUM: "V-PET", firstName: "Pat", lastName: "Petitioner" },
      membershipType: "PETITIONED",
      seatNumber: 1,
      submissionMetadata: null,
    },
    {
      voterRecord: { VRCNUM: "V-APP", firstName: "Ann", lastName: "Appointee" },
      membershipType: "APPOINTED",
      seatNumber: 2,
      submissionMetadata: null,
    },
  ],
  maxSeatsPerLted: 4,
  ltedWeight: null,
  seats: [
    { seatNumber: 1, isPetitioned: false, weight: null },
    { seatNumber: 2, isPetitioned: true, weight: null },
    { seatNumber: 3, isPetitioned: true, weight: null },
  ],
  designationWeightSummary: null,
};

describe("CommitteeSelector seat roster Type column", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission(true);
    installFetchMock(async (input) => {
      const url = String(input);
      if (url.startsWith("/api/committee/roster/")) {
        return fetchJsonResponse(emptyRoster);
      }
      if (url.startsWith("/api/fetchCommitteeList/")) {
        return fetchJsonResponse(committeeDetail);
      }
      return fetchJsonResponse([]);
    });
  });

  it("labels each seat by its occupant's membership type, not the seat flag", async () => {
    const committeeLists = [
      createMockCommitteeListRow({
        cityTown: "BRIGHTON",
        electionDistrict: 10,
        termId: "term-1",
      }),
    ];

    render(<CommitteeSelector committeeLists={committeeLists} />);

    await userEvent.selectOptions(screen.getByLabelText("Select City"), "BRIGHTON");
    await userEvent.selectOptions(
      screen.getByLabelText("Select Election District"),
      "10",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "View committee details" }),
    );

    const heading = await screen.findByRole("heading", { name: "Seat roster" });
    const table = within(heading.parentElement!).getByRole("table");
    const typeBySeat = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) => {
        const cells = within(row).getAllByRole("cell");
        return [cells[0]!.textContent, cells[2]!.textContent];
      });

    expect(typeBySeat).toEqual([
      ["1", "Petitioned"],
      ["2", "Appointed"],
      ["3", "—"],
    ]);
  });
});
