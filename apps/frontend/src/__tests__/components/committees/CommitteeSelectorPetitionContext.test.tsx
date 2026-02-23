import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel, type CommitteeList } from "@prisma/client";
import CommitteeSelector from "~/app/committees/CommitteeSelector";
import { mockHasPermission } from "../../utils/mocks";

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

describe("CommitteeSelector petition context link-out (SRS 4.4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission(true);
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/fetchCommitteeList/")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => ({
            id: 1,
            memberships: [],
            maxSeatsPerLted: 4,
            ltedWeight: null,
            seats: [{ seatNumber: 1, isPetitioned: true, weight: 0.5 }],
            designationWeightSummary: null,
          }),
        } as Response;
      }
      if (url.startsWith("/api/admin/petition-outcomes?")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => [
            {
              id: "m-lost",
              voterRecordId: "V-LOST",
              voter: { VRCNUM: "V-LOST", firstName: "Alex", lastName: "Smith" },
              status: "PETITIONED_LOST",
              petitionSeatNumber: 1,
              petitionPrimaryDate: "2024-09-15T00:00:00.000Z",
              petitionVoteCount: 6,
            },
          ],
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => [],
      } as Response;
    }) as jest.Mock;
  });

  it("shows direct link to filtered petition outcomes context for selected committee", async () => {
    const committeeLists = [
      {
        id: 1,
        cityTown: "BRIGHTON",
        legDistrict: 1,
        electionDistrict: 10,
        termId: "term-1",
      },
    ] as CommitteeList[];

    render(<CommitteeSelector committeeLists={committeeLists} />);

    await userEvent.selectOptions(screen.getByLabelText("Select City"), "BRIGHTON");
    await userEvent.selectOptions(
      screen.getByLabelText("Select Election District"),
      "10",
    );

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Open filtered petition outcomes" }),
      ).toBeInTheDocument();
    });

    const petitionLink = screen.getByRole("link", {
      name: "Open filtered petition outcomes",
    });
    expect(petitionLink).toHaveAttribute(
      "href",
      "/admin/petition-outcomes?committeeListId=1&termId=term-1",
    );

    expect(await screen.findByText("Lost")).toBeInTheDocument();
  });
});
