/**
 * Pending tab (ticket 10, plan §7.2): submitted candidates with submitter,
 * date, eligibility status and warnings; Admin accept/reject through
 * `handleRequest` with in-flight, disabled and error states; Leaders read-only.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel } from "@prisma/client";

import { PendingTab } from "~/app/committees/workspace/tabs/PendingTab";
import { MEETINGS_URL } from "~/app/committees/workspace/tabs/pending/useMeetingOptions";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import type * as UtilsModule from "~/lib/utils";
import type {
  CommitteeDetailResponse,
  PendingMembership,
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

// --- Fixtures ------------------------------------------------------------------

const ADMIN_SUBMISSION: PendingMembership = {
  membershipId: "m-1",
  voterRecordId: "VR001",
  firstName: "Jane",
  lastName: "Doe",
  submittedAt: "2026-03-02T15:00:00.000Z",
  isOwnSubmission: false,
  replacementFor: { voterRecordId: "VR009", firstName: "Old", lastName: "Member" },
  submittedBy: { id: "u-1", name: "Lee Leader" },
  requestNotes: "Met at the caucus",
  eligibilityWarnings: [
    { code: "RECENT_RESIGNATION", message: "Resigned from a committee recently." },
  ],
  contact: { email: null, phone: null },
};

const SECOND_SUBMISSION: PendingMembership = {
  membershipId: "m-2",
  voterRecordId: "VR002",
  firstName: "Sam",
  lastName: "Roe",
  submittedAt: "2026-04-10T15:00:00.000Z",
  isOwnSubmission: false,
  replacementFor: null,
  submittedBy: { id: "u-2", name: null },
  eligibilityWarnings: [],
  contact: { email: null, phone: null },
};

/** What a Leader receives: the Admin-only keys are absent. */
const LEADER_SUBMISSION: PendingMembership = {
  membershipId: "m-1",
  voterRecordId: "VR001",
  firstName: "Jane",
  lastName: "Doe",
  submittedAt: "2026-03-02T15:00:00.000Z",
  isOwnSubmission: true,
  replacementFor: null,
};

function detailWith(pending: PendingMembership[]): CommitteeDetailResponse {
  const rollup = {
    committeeListId: 2,
    cityTown: "GREECE",
    legDistrict: 1,
    electionDistrict: 2,
    filled: 2,
    totalSeats: 4,
    unassignedCount: 0,
    pendingCount: pending.length,
    designationWeight: null,
    missingWeightSeatNumbers: [],
  };
  return {
    committee: {
      committeeListId: 2,
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 2,
      termId: "term-1",
      ltedWeight: null,
    },
    term: {
      id: "term-1",
      label: "2024–2026",
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
    },
    maxSeatsPerLted: 4,
    rollup,
    rows: [],
    designationWeightSummary: {
      totalWeight: 0,
      totalContributingSeats: 0,
      seats: [],
      missingWeightSeatNumbers: [],
    },
    pending,
    history: { events: [], hasMore: false },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    headers: { get: () => "application/json" },
    json: async () => body,
  } as unknown as Response;
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const MEETINGS = {
  meetings: [
    {
      id: "meet-2",
      meetingDate: "2026-05-01T00:00:00.000Z",
      meetingType: "EXECUTIVE_COMMITTEE",
      notes: null,
      createdBy: null,
      createdAt: "2026-04-20T00:00:00.000Z",
      membershipCount: 0,
    },
    {
      id: "meet-1",
      meetingDate: "2026-03-15T00:00:00.000Z",
      meetingType: "OTHER",
      notes: null,
      createdBy: null,
      createdAt: "2026-03-01T00:00:00.000Z",
      membershipCount: 3,
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
};

type Handler = (body: Record<string, unknown>) => Promise<Response> | Response;

/** Serves the meetings list and `handleRequest` (through `onDecision`). */
function serve(onDecision: Handler = () => jsonResponse({ message: "ok" })) {
  const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === MEETINGS_URL) return jsonResponse(MEETINGS);
    if (url === "/api/committee/handleRequest") {
      return onDecision(JSON.parse(String(init?.body)) as Record<string, unknown>);
    }
    throw new Error(`unexpected fetch ${url}`);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const decisionBodies = (fetchMock: jest.Mock) =>
  fetchMock.mock.calls
    .filter(([input]) => String(input) === "/api/committee/handleRequest")
    .map(([, init]: [unknown, RequestInit]) => JSON.parse(String(init.body)) as unknown);

function renderTab(
  pending: PendingMembership[],
  role: PrivilegeLevel = PrivilegeLevel.Admin,
) {
  const onRefresh = jest.fn();
  render(
    <GlobalContext.Provider
      value={{ actingPermissions: role, setActingPermissions: () => undefined }}
    >
      <PendingTab committeeId={2} detail={detailWith(pending)} onRefresh={onRefresh} />
    </GlobalContext.Provider>,
  );
  return { onRefresh };
}

const item = (name: string) =>
  screen.getByRole("listitem", { name: new RegExp(name) });

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(hasPermissionFor)
    .mockImplementation(
      jest.requireActual<typeof UtilsModule>("~/lib/utils").hasPermissionFor,
    );
});

// --- Admin -----------------------------------------------------------------------

describe("PendingTab (Admin)", () => {
  it("lists submissions oldest first with submitter, date, eligibility and warnings", () => {
    serve();
    renderTab([ADMIN_SUBMISSION, SECOND_SUBMISSION]);

    expect(screen.getByRole("heading", { level: 3, name: "Pending" })).toBeInTheDocument();
    const items = Array.from(screen.getByRole("list", { name: "Pending submissions" }).children);
    expect(items.map((li) => li.querySelector("p")?.textContent)).toEqual([
      "Jane Doe · VRCNUM VR001",
      "Sam Roe · VRCNUM VR002",
    ]);

    const jane = item("Jane Doe");
    expect(jane).toHaveTextContent("Submitted Mar 2, 2026 by Lee Leader");
    expect(jane).toHaveTextContent("Replaces Old Member");
    expect(jane).toHaveTextContent("Notes: Met at the caucus");
    expect(jane).toHaveTextContent("Eligibility: 1 warning at submission");
    expect(jane).toHaveTextContent("Resigned from a committee recently.");

    const sam = item("Sam Roe");
    expect(sam).toHaveTextContent("Submitted Apr 10, 2026 by an unnamed user");
    expect(sam).toHaveTextContent("Eligibility: no warnings at submission");
  });

  it("links to the bulk review queue", () => {
    serve();
    renderTab([ADMIN_SUBMISSION]);
    expect(screen.getByRole("link", { name: "Review all pending requests" })).toHaveAttribute(
      "href",
      "/committees/requests",
    );
  });

  it("shows an empty state", () => {
    serve();
    renderTab([]);
    expect(screen.getByText("No pending submissions for this committee.")).toBeInTheDocument();
  });

  it("rejects: disables the controls while in flight, then announces and refreshes", async () => {
    const gate = deferred<Response>();
    const fetchMock = serve(() => gate.promise);
    const { onRefresh } = renderTab([ADMIN_SUBMISSION, SECOND_SUBMISSION]);

    await userEvent.click(within(item("Jane Doe")).getByRole("button", { name: "Reject Jane Doe" }));

    const rejecting = within(item("Jane Doe")).getByRole("button", { name: "Rejecting Jane Doe" });
    expect(rejecting).toBeDisabled();
    expect(within(item("Jane Doe")).getByRole("button", { name: "Accept Jane Doe" })).toBeDisabled();
    // Other submissions stay actionable.
    expect(within(item("Sam Roe")).getByRole("button", { name: "Reject Sam Roe" })).toBeEnabled();
    expect(onRefresh).not.toHaveBeenCalled();

    gate.resolve(jsonResponse({ message: "Request rejected" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Rejected Jane Doe."));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(decisionBodies(fetchMock)).toEqual([
      { membershipId: "m-1", acceptOrReject: "reject" },
    ]);
    // Until the refreshed detail drops it, the item cannot be decided again.
    expect(within(item("Jane Doe")).queryByRole("button")).not.toBeInTheDocument();
    expect(item("Jane Doe")).toHaveTextContent("Rejected. Updating…");
  });

  it("accepts at a chosen meeting record", async () => {
    const fetchMock = serve(() => jsonResponse({ message: "Request accepted" }));
    const { onRefresh } = renderTab([ADMIN_SUBMISSION]);

    await userEvent.click(screen.getByRole("button", { name: "Accept Jane Doe" }));

    const meeting = screen.getByRole("combobox", { name: "Meeting" });
    await waitFor(() => expect(meeting).toBeEnabled());
    const confirm = screen.getByRole("button", { name: "Confirm accept" });
    expect(confirm).toBeDisabled();
    expect(within(meeting).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Choose a meeting…",
      "May 1, 2026 · Executive committee",
      "Mar 15, 2026 · Other meeting",
    ]);

    await userEvent.selectOptions(meeting, "meet-1");
    await userEvent.click(confirm);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Accepted Jane Doe."));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(decisionBodies(fetchMock)).toEqual([
      { membershipId: "m-1", acceptOrReject: "accept", meetingRecordId: "meet-1" },
    ]);
    expect(fetchMock.mock.calls.filter(([u]) => String(u) === MEETINGS_URL)).toHaveLength(1);
  });

  it("shows the server's error on a failed reject and re-enables the controls", async () => {
    serve(() =>
      jsonResponse({ error: "This membership is not in a pending (SUBMITTED) state" }, 400),
    );
    const { onRefresh } = renderTab([ADMIN_SUBMISSION]);

    await userEvent.click(screen.getByRole("button", { name: "Reject Jane Doe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reject: This membership is not in a pending (SUBMITTED) state",
    );
    expect(screen.getByRole("button", { name: "Reject Jane Doe" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Accept Jane Doe" })).toBeEnabled();
    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("explains hard-stop ineligibility when an accept is refused", async () => {
    serve(() => jsonResponse({ error: "INELIGIBLE", reasons: ["CAPACITY"] }, 422));
    const { onRefresh } = renderTab([ADMIN_SUBMISSION]);

    await userEvent.click(screen.getByRole("button", { name: "Accept Jane Doe" }));
    const meeting = screen.getByRole("combobox", { name: "Meeting" });
    await waitFor(() => expect(meeting).toBeEnabled());
    await userEvent.selectOptions(meeting, "meet-2");
    await userEvent.click(screen.getByRole("button", { name: "Confirm accept" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cannot accept: Committee is at capacity (no open seats).",
    );
    expect(screen.getByRole("button", { name: "Confirm accept" })).toBeEnabled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("reports a failed meeting list and retries it", async () => {
    let failMeetings = true;
    const fetchMock = jest.fn(async (input: RequestInfo | URL) =>
      String(input) === MEETINGS_URL && failMeetings
        ? jsonResponse({ error: "boom" }, 500)
        : jsonResponse(MEETINGS),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    renderTab([ADMIN_SUBMISSION]);

    await userEvent.click(screen.getByRole("button", { name: "Accept Jane Doe" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load meetings (status 500)",
    );
    expect(screen.getByRole("button", { name: "Confirm accept" })).toBeDisabled();

    failMeetings = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Meeting" })).toBeEnabled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// --- Leader ----------------------------------------------------------------------

describe("PendingTab (Leader)", () => {
  it("shows the jurisdiction's submissions read-only, without controls or Admin context", () => {
    const fetchMock = serve();
    renderTab([LEADER_SUBMISSION], PrivilegeLevel.Leader);

    const jane = item("Jane Doe");
    expect(jane).toHaveTextContent("Submitted Mar 2, 2026 by you");
    expect(jane).not.toHaveTextContent("Eligibility");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Review all pending requests" })).not.toBeInTheDocument();
    expect(screen.getByText(/awaiting Admin review/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("follows actingPermissions: a Developer acting as Leader gets no controls or Admin context", () => {
    serve();
    // The server sent Admin-only keys (real privilege), but the UI acts as Leader.
    renderTab([ADMIN_SUBMISSION], PrivilegeLevel.Leader);

    const jane = item("Jane Doe");
    expect(jane).not.toHaveTextContent("Lee Leader");
    expect(jane).not.toHaveTextContent("Met at the caucus");
    expect(jane).not.toHaveTextContent("Resigned from a committee recently.");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
