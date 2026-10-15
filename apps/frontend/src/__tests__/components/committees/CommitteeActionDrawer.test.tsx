/**
 * Action drawer, add-member and submit-candidate flows (ticket 13, plan §8,
 * §12.2): candidate search and selection; eligible, warning, hard-stop,
 * retry and full-committee states; role-appropriate labels and endpoints;
 * server rejections keeping the drawer open; success closing it. Roles are
 * simulated through `actingPermissions`. Cross-pane refresh and focus
 * restoration are covered with the workspace in
 * `CommitteeWorkspace.drawer.test.tsx`.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel } from "@prisma/client";

import { CommitteeActionDrawer } from "~/app/committees/workspace/drawer/CommitteeActionDrawer";
import type {
  CommitteeAction,
  CommitteeRef,
} from "~/app/committees/workspace/committeeAction";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { toast } from "~/components/ui/use-toast";
import type { EligibilityPreflightResponse } from "~/lib/eligibilityPreflight";
import { hasPermissionFor } from "~/lib/utils";
import type * as UtilsModule from "~/lib/utils";
import type {
  CommitteeDetailResponse,
  SeatRosterRow,
} from "~/lib/validations/committee";

jest.mock("~/components/providers/GlobalContext", () => {
  const { createContext } = jest.requireActual<typeof React>("react");
  return {
    GlobalContext: createContext({
      actingPermissions: "Admin",
      setActingPermissions: () => undefined,
    }),
  };
});

jest.mock("~/components/ui/use-toast", () => ({
  toast: jest.fn(),
  useToast: () => ({ toast: jest.fn() }),
}));

// --- Fixtures -------------------------------------------------------------------

const REF: CommitteeRef = {
  committeeListId: 7,
  cityTown: "GREECE",
  legDistrict: 1,
  electionDistrict: 5,
};

const SEATED: SeatRosterRow = {
  ...REF,
  seatNumber: 1,
  isPetitioned: false,
  weight: null,
  occupant: {
    VRCNUM: "V-SEATED",
    firstName: "Sam",
    lastName: "Seated",
    membershipType: "APPOINTED",
  },
};
const VACANT: SeatRosterRow = { ...REF, seatNumber: 2, isPetitioned: false, weight: null, occupant: null };

function detail({
  filled = 1,
  maxSeats = 4,
}: { filled?: number; maxSeats?: number } = {}): CommitteeDetailResponse {
  return {
    committee: { ...REF, termId: "term-1", ltedWeight: null },
    term: {
      id: "term-1",
      label: "2024–2026",
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
    },
    maxSeatsPerLted: maxSeats,
    rollup: {
      ...REF,
      filled,
      totalSeats: maxSeats,
      unassignedCount: 0,
      pendingCount: 0,
      designationWeight: null,
      missingWeightSeatNumbers: [],
    },
    rows: [SEATED, VACANT],
    designationWeightSummary: {
      totalWeight: 0,
      totalContributingSeats: 0,
      seats: [],
      missingWeightSeatNumbers: [],
    },
    pending: [],
    history: { events: [], hasMore: false },
  };
}

const JANE = {
  VRCNUM: "V-JANE",
  firstName: "Jane",
  lastName: "Doe",
  houseNum: 12,
  street: "Main St",
  city: "GREECE",
  L_T: "1",
  electionDistrict: 5,
  party: "DEM",
};
/** Already on this committee: not selectable. */
const SAM = { ...JANE, VRCNUM: "V-SEATED", firstName: "Sam", lastName: "Seated" };

function preflight(
  overrides: Partial<EligibilityPreflightResponse> = {},
): EligibilityPreflightResponse {
  return {
    eligible: true,
    hardStops: [],
    warnings: [],
    snapshot: {
      voter: {
        voterRecordId: "V-JANE",
        name: "Jane Doe",
        homeCityTown: "GREECE",
        homeElectionDistrict: 5,
        homeAssemblyDistrict: "134",
        party: "DEM",
      },
      lted: { cityTown: "GREECE", legDistrict: 1, electionDistrict: 5 },
      committee: { activeMemberCount: 1, maxSeatsPerLted: 4 },
      warningState: "NONE",
    },
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

type Reply = { body: unknown; status?: number } | (() => Promise<never>);

/** Endpoint → queued replies (the last one repeats). */
function serve(routes: Record<string, Reply[]>) {
  const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const { pathname } = new URL(String(input), "http://localhost");
    const queue = routes[pathname];
    if (!queue?.length) throw new Error(`unexpected fetch ${pathname}`);
    const reply = queue.length > 1 ? queue.shift()! : queue[0]!;
    if (typeof reply === "function") return reply();
    return jsonResponse(reply.body, reply.status);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const callsTo = (fetchMock: jest.Mock, pathname: string): unknown[][] =>
  (fetchMock.mock.calls as unknown[][]).filter(
    ([input]) => new URL(String(input), "http://localhost").pathname === pathname,
  );
const bodyOf = (call: unknown[]) =>
  JSON.parse(String((call[1] as RequestInit).body)) as Record<string, unknown>;

function renderDrawer({
  role = PrivilegeLevel.Admin,
  action = { kind: "add-member", committee: REF, seatNumber: 2 },
  committeeDetail = detail(),
}: {
  role?: PrivilegeLevel;
  action?: CommitteeAction;
  committeeDetail?: CommitteeDetailResponse;
} = {}) {
  const onClose = jest.fn();
  const onComplete = jest.fn();
  render(
    <GlobalContext.Provider
      value={{ actingPermissions: role, setActingPermissions: () => undefined }}
    >
      <CommitteeActionDrawer
        action={action}
        detail={committeeDetail}
        onClose={onClose}
        onComplete={onComplete}
      />
    </GlobalContext.Provider>,
  );
  return { onClose, onComplete };
}

const drawer = () => screen.getByRole("dialog");

async function searchAndSelect(name = "Jane Doe") {
  await userEvent.type(within(drawer()).getByLabelText("Last name"), "Doe");
  await userEvent.click(within(drawer()).getByRole("button", { name: "Search" }));
  await userEvent.click(await within(drawer()).findByRole("button", { name: `Select ${name}` }));
}

const continueButton = () => within(drawer()).getByRole("button", { name: "Continue" });

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(hasPermissionFor)
    .mockImplementation(
      jest.requireActual<typeof UtilsModule>("~/lib/utils").hasPermissionFor,
    );
});

// --- Tests -------------------------------------------------------------------------

describe("CommitteeActionDrawer: find candidate", () => {
  it("names the action and committee, and searches the committee's district by default", async () => {
    const fetchMock = serve({
      "/api/fetchFilteredData": [{ body: { data: [SAM, JANE], totalRecords: 2 } }],
    });
    renderDrawer();

    expect(within(drawer()).getByRole("heading", { level: 2, name: "Add member" })).toBeInTheDocument();
    expect(drawer()).toHaveTextContent("GREECE · LD 1 · ED 5");
    expect(within(drawer()).getByRole("heading", { level: 3, name: /Find candidate/ })).toBeInTheDocument();
    expect(within(drawer()).getByRole("checkbox", { name: "Only eligible candidates" })).toBeChecked();

    await userEvent.type(within(drawer()).getByLabelText("Last name"), "Doe");
    await userEvent.click(within(drawer()).getByRole("button", { name: "Search" }));

    const results = await within(drawer()).findByRole("list", { name: "Candidates" });
    expect(bodyOf(callsTo(fetchMock, "/api/fetchFilteredData")[0]!).searchQuery).toEqual([
      { field: "city", values: ["GREECE"] },
      { field: "L_T", values: ["1"] },
      { field: "electionDistrict", values: [5] },
      { field: "lastName", values: ["DOE"] }, // normalized, as in the legacy search
    ]);
    // An existing member is listed but cannot be picked.
    const sam = within(results).getByRole("listitem", { name: /Sam Seated/ });
    expect(sam).toHaveTextContent("Already on this committee");
    expect(within(sam).queryByRole("button")).not.toBeInTheDocument();
    expect(within(results).getByRole("button", { name: "Select Jane Doe" })).toBeEnabled();
  });

  it("searches everyone when only-eligible is unchecked, and says when nothing matched", async () => {
    const fetchMock = serve({ "/api/fetchFilteredData": [{ body: { data: [], totalRecords: 0 } }] });
    renderDrawer();

    await userEvent.click(within(drawer()).getByRole("checkbox", { name: "Only eligible candidates" }));
    await userEvent.type(within(drawer()).getByLabelText("First name"), "Zed");
    await userEvent.click(within(drawer()).getByRole("button", { name: "Search" }));

    expect(await within(drawer()).findByText("No voters matched.")).toBeInTheDocument();
    expect(bodyOf(callsTo(fetchMock, "/api/fetchFilteredData")[0]!).searchQuery).toEqual([
      { field: "firstName", values: ["ZED"] },
    ]);
  });

  it("blocks adding to a full committee before any candidate is picked", async () => {
    serve({ "/api/fetchFilteredData": [{ body: { data: [JANE], totalRecords: 1 } }] });
    renderDrawer({ committeeDetail: detail({ filled: 4 }) });

    expect(within(drawer()).getByRole("alert")).toHaveTextContent("This committee is full");
    await userEvent.click(within(drawer()).getByRole("button", { name: "Search" }));
    const jane = await within(drawer()).findByRole("listitem", { name: /Jane Doe/ });
    expect(within(jane).getByRole("button", { name: "Select Jane Doe" })).toBeDisabled();
  });
});

describe("CommitteeActionDrawer: review candidate", () => {
  it("checks eligibility for the selected candidate and continues when eligible", async () => {
    const fetchMock = serve({
      "/api/fetchFilteredData": [{ body: { data: [JANE], totalRecords: 1 } }],
      "/api/committee/eligibility": [{ body: preflight() }],
    });
    renderDrawer();
    await searchAndSelect();

    expect(within(drawer()).getByRole("heading", { level: 3, name: /Review candidate/ })).toBeInTheDocument();
    expect(await within(drawer()).findByText("Eligibility Snapshot")).toBeInTheDocument();
    const [url] = callsTo(fetchMock, "/api/committee/eligibility")[0] ?? [];
    expect(String(url)).toBe("/api/committee/eligibility?voterRecordId=V-JANE&committeeListId=7");
    expect(drawer()).toHaveTextContent("Committee seats: 1/4");
    expect(continueButton()).toBeEnabled();
  });

  it("shows nonblocking warnings and still allows continuing", async () => {
    serve({
      "/api/fetchFilteredData": [{ body: { data: [JANE], totalRecords: 1 } }],
      "/api/committee/eligibility": [
        {
          body: preflight({
            warnings: [{ code: "POSSIBLY_INACTIVE", message: "Voter may be inactive." }],
          }),
        },
      ],
    });
    renderDrawer();
    await searchAndSelect();

    expect(await within(drawer()).findByText("Non-blocking warnings")).toBeInTheDocument();
    expect(drawer()).toHaveTextContent("Voter may be inactive.");
    expect(continueButton()).toBeEnabled();
  });

  it("stops on a hard stop (submission roles get no override)", async () => {
    serve({
      "/api/fetchFilteredData": [{ body: { data: [JANE], totalRecords: 1 } }],
      "/api/committee/eligibility": [
        { body: preflight({ eligible: false, hardStops: ["PARTY_MISMATCH"] }) },
      ],
    });
    renderDrawer({ role: PrivilegeLevel.Leader });
    await searchAndSelect();

    expect(await within(drawer()).findByText("Ineligible for this committee")).toBeInTheDocument();
    expect(drawer()).toHaveTextContent("Party does not match");
    expect(continueButton()).toBeDisabled();
    expect(within(drawer()).queryByRole("checkbox", { name: /Override/ })).not.toBeInTheDocument();
  });

  it("lets an Admin override a hard stop with a required reason", async () => {
    const fetchMock = serve({
      "/api/fetchFilteredData": [{ body: { data: [JANE], totalRecords: 1 } }],
      "/api/committee/eligibility": [
        { body: preflight({ eligible: false, hardStops: ["PARTY_MISMATCH"] }) },
      ],
      "/api/committee/add": [{ body: { success: true, message: "Member added to committee" } }],
    });
    const { onComplete } = renderDrawer();
    await searchAndSelect();
    await within(drawer()).findByText("Ineligible for this committee");
    expect(continueButton()).toBeDisabled();

    await userEvent.click(within(drawer()).getByRole("checkbox", { name: /Override these hard stops/ }));
    await userEvent.click(continueButton());
    expect(continueButton()).toBeDisabled(); // reason still blank
    await userEvent.type(within(drawer()).getByLabelText(/Override reason/), "Approved by the chair");
    await userEvent.click(continueButton());
    expect(drawer()).toHaveTextContent("Approved by the chair");
    await userEvent.click(within(drawer()).getByRole("button", { name: "Add member" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(bodyOf(callsTo(fetchMock, "/api/committee/add")[0]!)).toMatchObject({
      memberId: "V-JANE",
      forceAdd: true,
      overrideReason: "Approved by the chair",
    });
  });

  it("offers Retry when the eligibility check fails", async () => {
    const fetchMock = serve({
      "/api/fetchFilteredData": [{ body: { data: [JANE], totalRecords: 1 } }],
      "/api/committee/eligibility": [
        { body: { error: "Failed to check eligibility" }, status: 500 },
        { body: preflight() },
      ],
    });
    renderDrawer();
    await searchAndSelect();

    expect(await within(drawer()).findByText("Eligibility Snapshot Unavailable")).toBeInTheDocument();
    expect(continueButton()).toBeDisabled();
    await userEvent.click(within(drawer()).getByRole("button", { name: "Retry eligibility check" }));
    expect(await within(drawer()).findByText("Eligibility Snapshot")).toBeInTheDocument();
    expect(callsTo(fetchMock, "/api/committee/eligibility")).toHaveLength(2);
    expect(continueButton()).toBeEnabled();
  });

  it("goes back to the results to pick someone else", async () => {
    serve({
      "/api/fetchFilteredData": [{ body: { data: [JANE], totalRecords: 1 } }],
      "/api/committee/eligibility": [{ body: preflight() }],
    });
    renderDrawer();
    await searchAndSelect();
    await userEvent.click(within(drawer()).getByRole("button", { name: "Back" }));
    expect(within(drawer()).getByRole("button", { name: "Select Jane Doe" })).toBeInTheDocument();
  });
});

describe("CommitteeActionDrawer: Admin add", () => {
  it("collects membership details, confirms the destination and adds the member", async () => {
    const fetchMock = serve({
      "/api/fetchFilteredData": [{ body: { data: [JANE], totalRecords: 1 } }],
      "/api/committee/eligibility": [{ body: preflight() }],
      "/api/committee/add": [{ body: { success: true, message: "Member added to committee" } }],
    });
    const { onComplete, onClose } = renderDrawer();
    await searchAndSelect();
    await within(drawer()).findByText("Eligibility Snapshot");
    await userEvent.click(continueButton());

    expect(within(drawer()).getByRole("heading", { level: 3, name: /Membership details/ })).toBeInTheDocument();
    expect(within(drawer()).getByRole("radio", { name: "Appointed" })).toBeChecked();
    await userEvent.click(within(drawer()).getByRole("radio", { name: "Petitioned" }));
    await userEvent.type(within(drawer()).getByRole("textbox", { name: "Member contact email" }), "jane@example.com");
    await userEvent.click(continueButton());

    expect(within(drawer()).getByRole("heading", { level: 3, name: /Confirm/ })).toBeInTheDocument();
    const summary = within(drawer()).getByRole("list", { name: "Summary" });
    expect(summary).toHaveTextContent("GREECE · LD 1 · ED 5");
    expect(summary).toHaveTextContent("Next open seat");
    expect(summary).toHaveTextContent("Jane Doe (V-JANE)");
    expect(summary).toHaveTextContent("Petitioned");
    expect(summary).toHaveTextContent("jane@example.com");

    await userEvent.click(within(drawer()).getByRole("button", { name: "Add member" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith({
      title: "Success",
      description: "Committee member added successfully",
    });
    expect(bodyOf(callsTo(fetchMock, "/api/committee/add")[0]!)).toEqual({
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 5,
      memberId: "V-JANE",
      membershipType: "PETITIONED",
      email: "jane@example.com",
    });
  });

  it("keeps the drawer open with the server's hard stops, then succeeds on retry after an error", async () => {
    serve({
      "/api/fetchFilteredData": [{ body: { data: [JANE], totalRecords: 1 } }],
      "/api/committee/eligibility": [{ body: preflight() }],
      "/api/committee/add": [
        { body: { success: false, error: "INELIGIBLE", reasons: ["CAPACITY"] }, status: 422 },
        { body: { success: false, error: "Internal server error" }, status: 500 },
        { body: { success: true, message: "Member added to committee" } },
      ],
    });
    const { onComplete, onClose } = renderDrawer();
    await searchAndSelect();
    await within(drawer()).findByText("Eligibility Snapshot");
    await userEvent.click(continueButton());
    await userEvent.click(continueButton());
    const add = () => within(drawer()).getByRole("button", { name: "Add member" });

    await userEvent.click(add());
    const blocked = await within(drawer()).findByRole("alert");
    expect(blocked).toHaveTextContent("Cannot add member");
    expect(blocked).toHaveTextContent("Committee is at capacity");
    expect(onComplete).not.toHaveBeenCalled();

    await userEvent.click(add());
    await waitFor(() => expect(within(drawer()).getByRole("alert")).toHaveTextContent("Internal server error"));
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(add());
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("CommitteeActionDrawer: submission roles", () => {
  it("submits a candidate through requestAdd for a Leader", async () => {
    const fetchMock = serve({
      "/api/fetchFilteredData": [{ body: { data: [JANE], totalRecords: 1 } }],
      "/api/committee/eligibility": [{ body: preflight() }],
      "/api/committee/requestAdd": [{ body: { success: true, message: "ok" } }],
    });
    const { onComplete } = renderDrawer({ role: PrivilegeLevel.Leader });
    expect(within(drawer()).getByRole("heading", { level: 2, name: "Submit candidate" })).toBeInTheDocument();

    await searchAndSelect();
    await within(drawer()).findByText("Eligibility Snapshot");
    await userEvent.click(continueButton());
    expect(within(drawer()).queryByRole("radio", { name: "Appointed" })).not.toBeInTheDocument();
    await userEvent.type(within(drawer()).getByLabelText("Notes for the reviewer"), "Active volunteer");
    await userEvent.click(continueButton());

    expect(drawer()).toHaveTextContent("not on the committee until an Admin accepts");
    await userEvent.click(within(drawer()).getByRole("button", { name: "Submit candidate" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(callsTo(fetchMock, "/api/committee/add")).toHaveLength(0);
    expect(bodyOf(callsTo(fetchMock, "/api/committee/requestAdd")[0]!)).toEqual({
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 5,
      addMemberId: "V-JANE",
      requestNotes: "Active volunteer",
    });
    expect(toast).toHaveBeenCalledWith({
      title: "Success",
      description: "Submitted your request for approval",
    });
  });

  it("submits a replacement with the occupant as the target, even on a full committee", async () => {
    const fetchMock = serve({
      "/api/fetchFilteredData": [{ body: { data: [JANE], totalRecords: 1 } }],
      "/api/committee/eligibility": [{ body: preflight() }],
      "/api/committee/requestAdd": [{ body: { success: true, message: "ok" } }],
    });
    const { onComplete } = renderDrawer({
      role: PrivilegeLevel.Leader,
      action: { kind: "replace-member", committee: REF, memberId: "V-SEATED" },
      committeeDetail: detail({ filled: 4 }),
    });
    expect(within(drawer()).getByRole("heading", { level: 2, name: "Replace member" })).toBeInTheDocument();
    expect(drawer()).toHaveTextContent("Replacing Sam Seated (seat 1)");
    expect(within(drawer()).queryByText(/This committee is full/)).not.toBeInTheDocument();

    await searchAndSelect();
    await within(drawer()).findByText("Eligibility Snapshot");
    await userEvent.click(continueButton());
    await userEvent.click(continueButton());
    expect(within(drawer()).getByRole("list", { name: "Summary" })).toHaveTextContent("Sam Seated (seat 1)");
    await userEvent.click(within(drawer()).getByRole("button", { name: "Submit candidate" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(bodyOf(callsTo(fetchMock, "/api/committee/requestAdd")[0]!)).toMatchObject({
      addMemberId: "V-JANE",
      removeMemberId: "V-SEATED",
    });
  });

  it("offers no action to ReadAccess", () => {
    serve({});
    renderDrawer({ role: PrivilegeLevel.ReadAccess });
    expect(drawer()).toHaveTextContent("Your role can't change this committee.");
    expect(within(drawer()).queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
  });
});

// --- Ticket 14: removal and resignation ------------------------------------------------

const REMOVE: CommitteeAction = { kind: "remove-member", committee: REF, memberId: "V-SEATED" };
const RESIGN: CommitteeAction = { kind: "record-resignation", committee: REF, memberId: "V-SEATED" };
const hint = () => within(drawer()).getByTestId("member-exit-requirements");

describe("CommitteeActionDrawer: remove member", () => {
  it("requires a reason, and notes for Other, then removes and completes", async () => {
    const fetchMock = serve({ "/api/committee/remove": [{ body: { status: "success" } }] });
    const { onComplete, onClose } = renderDrawer({ action: REMOVE });

    expect(within(drawer()).getByRole("heading", { level: 2, name: "Remove member" })).toBeInTheDocument();
    expect(drawer()).toHaveTextContent("Removing Sam Seated (V-SEATED), seat 1");
    expect(drawer()).toHaveTextContent("administrative removal, not a resignation");
    const remove = within(drawer()).getByRole("button", { name: "Remove member" });
    expect(remove).toBeDisabled();
    expect(hint()).toHaveTextContent("Choose a reason.");

    await userEvent.selectOptions(within(drawer()).getByLabelText(/Reason for removal/), "OTHER");
    expect(remove).toBeDisabled();
    expect(hint()).toHaveTextContent("Notes are required when the reason is Other.");
    expect(within(drawer()).getByLabelText("Notes (required)")).toBeInTheDocument();

    await userEvent.type(within(drawer()).getByLabelText("Notes (required)"), "Asked to step down");
    expect(remove).toBeEnabled();
    await userEvent.click(remove);

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith({
      title: "Success",
      description: "Committee member removed successfully",
    });
    expect(bodyOf(callsTo(fetchMock, "/api/committee/remove")[0]!)).toEqual({
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 5,
      memberId: "V-SEATED",
      removalReason: "OTHER",
      removalNotes: "Asked to step down",
    });
  });

  it("keeps the drawer open with the server's error", async () => {
    serve({
      "/api/committee/remove": [
        { body: { status: "error", error: "Member does not have an active membership in this committee" }, status: 400 },
      ],
    });
    const { onComplete, onClose } = renderDrawer({ action: REMOVE });
    await userEvent.selectOptions(within(drawer()).getByLabelText(/Reason for removal/), "DECEASED");
    await userEvent.click(within(drawer()).getByRole("button", { name: "Remove member" }));

    expect(await within(drawer()).findByRole("alert")).toHaveTextContent(
      "Member does not have an active membership in this committee",
    );
    expect(onComplete).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(within(drawer()).getByRole("button", { name: "Remove member" })).toBeEnabled();
  });

  it("is Admin-only", () => {
    serve({});
    renderDrawer({ role: PrivilegeLevel.Leader, action: REMOVE });
    expect(drawer()).toHaveTextContent("Your role can't change this committee.");
    expect(within(drawer()).queryByRole("button", { name: "Remove member" })).not.toBeInTheDocument();
  });
});

describe("CommitteeActionDrawer: record resignation", () => {
  it("requires the received date, method and reason, then records the resignation", async () => {
    const fetchMock = serve({ "/api/committee/remove": [{ body: { status: "success" } }] });
    const { onComplete } = renderDrawer({ action: RESIGN });

    expect(within(drawer()).getByRole("heading", { level: 2, name: "Record resignation" })).toBeInTheDocument();
    expect(drawer()).toHaveTextContent("Recording a resignation for Sam Seated (V-SEATED), seat 1");
    const record = within(drawer()).getByRole("button", { name: "Record resignation" });
    expect(record).toBeDisabled();
    expect(hint()).toHaveTextContent("Enter the date the resignation was received.");
    expect(hint()).toHaveTextContent("Choose how it was received.");
    expect(hint()).toHaveTextContent("Choose a reason.");

    await userEvent.type(within(drawer()).getByLabelText(/Date resignation received/), "2026-10-01");
    await userEvent.click(within(drawer()).getByRole("radio", { name: "Mail" }));
    await userEvent.selectOptions(
      within(drawer()).getByLabelText(/Reason for resignation/),
      "MOVED_OUT_OF_DISTRICT",
    );
    expect(record).toBeEnabled();
    await userEvent.click(record);

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledWith({
      title: "Success",
      description: "Resignation recorded successfully",
    });
    expect(bodyOf(callsTo(fetchMock, "/api/committee/remove")[0]!)).toEqual({
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 5,
      memberId: "V-SEATED",
      action: "RESIGN",
      resignationDateReceived: "2026-10-01",
      resignationMethod: "MAIL",
      resignationReason: "MOVED_OUT_OF_DISTRICT",
    });
  });
});

describe("CommitteeActionDrawer: closing", () => {
  it("closes on Escape and Cancel without completing", async () => {
    serve({});
    const { onClose, onComplete } = renderDrawer();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.click(within(drawer()).getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
