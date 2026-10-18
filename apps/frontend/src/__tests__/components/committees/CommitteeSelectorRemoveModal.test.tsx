/**
 * Legacy `/committees` removal and resignation dialogs (SRS 2.3, 2.5). Since
 * ticket 14 they render the action drawer's forms (`MemberExitForms`), so the
 * rules are the drawer's: removal needs a reason, and notes for Other;
 * resignation needs the received date, method and reason. Both post to
 * `/api/committee/remove` on the composite key, then refresh the detail.
 * Server-side validation stays covered by `__tests__/api/committee/remove.test.ts`.
 *
 * The harness follows `CommitteeSelector.detailLayout.test.tsx`.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel, type CommitteeList } from "@prisma/client";
import CommitteeSelector from "~/app/committees/CommitteeSelector";
import { GlobalContext } from "~/components/providers/GlobalContext";
import {
  fetchJsonResponse,
  installFetchMock,
  mockHasPermission,
} from "../../utils/mocks";

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
  }: {
    items: Array<{ label: string; value: string }>;
    onSelect: (value: string) => void;
    displayLabel: string;
  }) => (
    <select aria-label={displayLabel} defaultValue="" onChange={(e) => onSelect(e.target.value)}>
      <option value="">Select</option>
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  ),
}));

jest.mock("~/app/committees/AddCommitteeForm", () => ({ AddCommitteeForm: () => null }));
jest.mock("~/app/committees/CommitteeRequestForm", () => () => null);
jest.mock("~/app/recordsearch/VoterCard", () => ({
  VoterCard: () => <div data-testid="voter-card" />,
}));
jest.mock("~/app/committees/CommitteeSummaryBlock", () => ({
  CommitteeSummaryBlock: () => <div data-testid="summary-block" />,
}));
jest.mock("~/hooks/useApiQuery", () => ({
  useApiQuery: () => ({ data: null, loading: false, error: null }),
}));

// One stable function: the selector keys callbacks (and fetch effects) on it.
const toastMock = jest.fn();
jest.mock("~/components/ui/use-toast", () => {
  const toast = (...args: unknown[]): void => {
    toastMock(...args);
  };
  const hook = { toast };
  return { toast, useToast: () => hook };
});

const committeeLists = [
  { id: 1, cityTown: "GREECE", legDistrict: 1, electionDistrict: 5, termId: "term-1" },
] as CommitteeList[];

function rosterResponse() {
  return {
    scope: { cityTown: "GREECE" },
    rows: [],
    edRollups: [
      {
        electionDistrict: 5,
        legDistrict: 1,
        filled: 1,
        totalSeats: 4,
        unassignedCount: 0,
        designationWeight: null,
        missingWeightSeatNumbers: [],
      },
    ],
    summary: { totalSeats: 4, filled: 1, vacant: 3, edCount: 1, unassignedCount: 0 },
  };
}

function detailResponse() {
  return {
    id: 1,
    memberships: [
      {
        voterRecord: { VRCNUM: "V1", firstName: "Jane", lastName: "Doe" },
        membershipType: "APPOINTED",
        seatNumber: 1,
      },
    ],
    maxSeatsPerLted: 4,
    ltedWeight: null,
    seats: [{ seatNumber: 1, isPetitioned: false, weight: null }],
    designationWeightSummary: { totalWeight: 0, missingWeightSeatNumbers: [], seats: [] },
  };
}

type FetchMock = ReturnType<typeof installFetchMock>;

function installFetch(): FetchMock {
  return installFetchMock(async (input) => {
    const url = String(input);
    const body = url.startsWith("/api/committee/roster")
      ? rosterResponse()
      : url.startsWith("/api/fetchCommitteeList/")
        ? detailResponse()
        : url === "/api/committee/remove"
          ? { status: "success" }
          : [];
    return fetchJsonResponse(body);
  });
}

const callsTo = (fetchMock: FetchMock, prefix: string) =>
  fetchMock.mock.calls.filter(([input]) => String(input).startsWith(prefix));
const postedBody = (fetchMock: FetchMock, url: string): unknown =>
  JSON.parse(String(callsTo(fetchMock, url)[0]?.[1]?.body));

async function openAdminDetail() {
  render(
    <GlobalContext.Provider
      value={{ actingPermissions: PrivilegeLevel.Admin, setActingPermissions: () => undefined }}
    >
      <CommitteeSelector committeeLists={committeeLists} />
    </GlobalContext.Provider>,
  );
  await userEvent.selectOptions(screen.getByLabelText("Select City"), "GREECE");
  await userEvent.selectOptions(screen.getByLabelText("Select Election District"), "5");
  await userEvent.click(screen.getByRole("button", { name: "View committee details" }));
  expect(await screen.findByTestId("voter-card")).toBeInTheDocument();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHasPermission(true);
});

describe("CommitteeSelector Remove Member dialog (SRS 2.5)", () => {
  it("requires a reason (and notes for Other), posts the removal, refreshes and closes", async () => {
    const fetchMock = installFetch();
    await openAdminDetail();
    const detailLoads = callsTo(fetchMock, "/api/fetchCommitteeList/").length;

    await userEvent.click(screen.getByRole("button", { name: "Remove Member" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Remove Member" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Removing Jane Doe (V1) from the committee");
    const remove = within(dialog).getByRole("button", { name: "Remove member" });
    expect(remove).toBeDisabled();

    await userEvent.selectOptions(within(dialog).getByLabelText(/Reason for removal/), "OTHER");
    expect(remove).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText("Notes (required)"), "Stepped down");
    await userEvent.click(remove);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(postedBody(fetchMock, "/api/committee/remove")).toEqual({
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 5,
      memberId: "V1",
      removalReason: "OTHER",
      removalNotes: "Stepped down",
    });
    expect(callsTo(fetchMock, "/api/fetchCommitteeList/").length).toBeGreaterThan(detailLoads);
    expect(toastMock).toHaveBeenCalledWith({
      title: "Success",
      description: "Committee member removed successfully",
    });
  });
});

describe("CommitteeSelector Record Resignation dialog (SRS 2.3)", () => {
  it("requires date, method and reason, then posts a RESIGN body", async () => {
    const fetchMock = installFetch();
    await openAdminDetail();

    await userEvent.click(screen.getByRole("button", { name: "Record Resignation" }));
    const dialog = await screen.findByRole("dialog");
    const record = within(dialog).getByRole("button", { name: "Record resignation" });
    expect(record).toBeDisabled();

    await userEvent.type(within(dialog).getByLabelText(/Date resignation received/), "2026-10-01");
    await userEvent.click(within(dialog).getByRole("radio", { name: "Email" }));
    await userEvent.selectOptions(within(dialog).getByLabelText(/Reason for resignation/), "DECEASED");
    await userEvent.click(record);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(postedBody(fetchMock, "/api/committee/remove")).toEqual({
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 5,
      memberId: "V1",
      action: "RESIGN",
      resignationDateReceived: "2026-10-01",
      resignationMethod: "EMAIL",
      resignationReason: "DECEASED",
    });
  });
});
