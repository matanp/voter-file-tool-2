/**
 * The action drawer inside the workspace (ticket 13, plan §8, §12.2): a roster
 * row action opens the drawer, a successful add refreshes the detail and the
 * affected grid row while selection, tab and filters stay put, and closing the
 * drawer (success, Escape) returns focus to the row's action trigger and
 * resets it for the next opening.
 *
 * The harness follows `CommitteeWorkspace.pendingRefresh.test.tsx`, with a
 * stateful server whose `add` fills the committee's next open seat.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel } from "@prisma/client";

import { CommitteeWorkspace } from "~/app/committees/workspace/CommitteeWorkspace";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { toast } from "~/components/ui/use-toast";
import { hasPermissionFor } from "~/lib/utils";
import type * as UtilsModule from "~/lib/utils";
import { summarizeEdRollups } from "~/lib/summarizeEdRollups";
import { fetchJsonResponse, installFetchMock } from "../../utils/mocks";
import type {
  CommitteeDetailResponse,
  EdRollup,
  RosterResponse,
  SeatRosterRow,
} from "~/lib/validations/committee";

// --- next/navigation backed by an in-memory URL --------------------------------

const mockUrl = (() => {
  let params = new URLSearchParams();
  const listeners = new Set<() => void>();
  return {
    get: () => params,
    reset(query: string) {
      params = new URLSearchParams(query);
    },
    set(href: string) {
      params = new URL(href, "http://localhost").searchParams;
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
})();

const mockPush = jest.fn((href: string) => mockUrl.set(href));
const mockReplace = jest.fn((href: string) => mockUrl.set(href));

jest.mock("next/navigation", () => {
  const { useSyncExternalStore } = jest.requireActual<typeof React>("react");
  return {
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
    usePathname: () => "/committees",
    useSearchParams: () =>
      useSyncExternalStore(mockUrl.subscribe, mockUrl.get, mockUrl.get),
  };
});

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

// --- Fixtures and a stateful fake server ------------------------------------------

function rollup(
  committeeListId: number,
  cityTown: string,
  legDistrict: number,
  electionDistrict: number,
): EdRollup {
  return {
    committeeListId,
    cityTown,
    legDistrict,
    electionDistrict,
    filled: 1,
    totalSeats: 4,
    unassignedCount: 0,
    pendingCount: 0,
    designationWeight: null,
    missingWeightSeatNumbers: [],
  };
}

const JANE = {
  VRCNUM: "V-JANE",
  firstName: "Jane",
  lastName: "Doe",
  city: "GREECE",
  electionDistrict: 2,
};

const ELIGIBLE = {
  eligible: true,
  hardStops: [],
  warnings: [],
  snapshot: {
    voter: {
      voterRecordId: "V-JANE",
      name: "Jane Doe",
      homeCityTown: "GREECE",
      homeElectionDistrict: 2,
      homeAssemblyDistrict: null,
      party: "DEM",
    },
    lted: { cityTown: "GREECE", legDistrict: 1, electionDistrict: 2 },
    committee: { activeMemberCount: 1, maxSeatsPerLted: 4 },
    warningState: "NONE",
  },
};

type Occupant = NonNullable<SeatRosterRow["occupant"]>;

type Server = {
  rollups: EdRollup[];
  /** committeeListId → occupant per seat (index = seat - 1). */
  seats: Map<number, Array<Occupant | null>>;
  /** committeeListId → active members without a seat. */
  unassigned: Map<number, Occupant[]>;
  /** While set, `/api/committee/remove` waits on it. */
  removeGate: Promise<void> | null;
  /** While true, the detail endpoint fails. */
  failDetail: boolean;
};

const person = (VRCNUM: string, firstName: string, lastName: string): Occupant => ({
  VRCNUM,
  firstName,
  lastName,
  membershipType: "APPOINTED",
});

function newServer(): Server {
  return {
    rollups: [rollup(1, "GREECE", 1, 1), rollup(2, "GREECE", 1, 2), rollup(3, "PENFIELD", 2, 1)],
    seats: new Map([
      [1, [person("V-SAM1", "Sam", "Seated"), null, null, null]],
      [2, [person("V-SAM2", "Sam", "Seated"), null, null, null]],
      [3, [person("V-SAM3", "Sam", "Seated"), null, null, null]],
    ]),
    unassigned: new Map(),
    removeGate: null,
    failDetail: false,
  };
}

function detailFor(server: Server, r: EdRollup): CommitteeDetailResponse {
  const base = {
    committeeListId: r.committeeListId,
    cityTown: r.cityTown,
    legDistrict: r.legDistrict,
    electionDistrict: r.electionDistrict,
    isPetitioned: false,
    weight: null,
    contact: { email: null, phone: null },
  };
  const rows: SeatRosterRow[] = [
    ...(server.seats.get(r.committeeListId) ?? []).map((occupant, i) => ({
      ...base,
      seatNumber: i + 1,
      occupant,
    })),
    ...(server.unassigned.get(r.committeeListId) ?? []).map((occupant) => ({
      ...base,
      seatNumber: null,
      unassigned: true,
      occupant,
    })),
  ];
  return {
    committee: {
      committeeListId: r.committeeListId,
      cityTown: r.cityTown,
      legDistrict: r.legDistrict,
      electionDistrict: r.electionDistrict,
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
    rollup: r,
    rows,
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

function rosterPage(server: Server): RosterResponse {
  const towns = Array.from(new Set(server.rollups.map((r) => r.cityTown)));
  const pairs = new Map(
    server.rollups.map((r) => [
      `${r.cityTown}|${r.legDistrict}`,
      { cityTown: r.cityTown, legDistrict: r.legDistrict },
    ]),
  );
  return {
    scope: {},
    filters: { towns, legDistricts: Array.from(pairs.values()) },
    edRollups: server.rollups,
    summary: summarizeEdRollups(server.rollups),
    nextCursor: null,
  };
}

function addMember(server: Server, body: { cityTown: string; legDistrict?: number; electionDistrict: number; memberId: string }) {
  const r = server.rollups.find(
    (x) =>
      x.cityTown === body.cityTown &&
      x.legDistrict === body.legDistrict &&
      x.electionDistrict === body.electionDistrict,
  );
  if (!r) return fetchJsonResponse({ success: false, error: "Committee not found" }, 404);
  const seats = server.seats.get(r.committeeListId)!;
  seats[seats.indexOf(null)] = person(body.memberId, "Jane", "Doe");
  server.rollups = server.rollups.map((x) => (x === r ? { ...x, filled: x.filled + 1 } : x));
  return fetchJsonResponse({ success: true, message: "Member added to committee" });
}

function removeMember(server: Server, memberId: string) {
  for (const [committeeListId, seats] of server.seats) {
    const seat = seats.findIndex((s) => s?.VRCNUM === memberId);
    if (seat === -1) continue;
    seats[seat] = null;
    server.rollups = server.rollups.map((x) =>
      x.committeeListId === committeeListId ? { ...x, filled: x.filled - 1 } : x,
    );
    return fetchJsonResponse({ status: "success" });
  }
  for (const [committeeListId, members] of server.unassigned) {
    if (!members.some((m) => m.VRCNUM === memberId)) continue;
    server.unassigned.set(committeeListId, members.filter((m) => m.VRCNUM !== memberId));
    server.rollups = server.rollups.map((x) =>
      x.committeeListId === committeeListId
        ? { ...x, unassignedCount: x.unassignedCount - 1 }
        : x,
    );
    return fetchJsonResponse({ status: "success" });
  }
  return fetchJsonResponse({ status: "error", error: "Member not found in this committee" }, 404);
}

function serve(server: Server) {
  return installFetchMock(async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    const detail = /^\/api\/committee\/(\d+)\/detail$/.exec(url.pathname);
    if (detail) {
      if (server.failDetail) return fetchJsonResponse({ error: "Detail unavailable" }, 500);
      const r = server.rollups.find((x) => x.committeeListId === Number(detail[1]));
      return r ? fetchJsonResponse(detailFor(server, r)) : fetchJsonResponse({ error: "nope" }, 404);
    }
    switch (url.pathname) {
      case "/api/committee/roster":
        return fetchJsonResponse(rosterPage(server));
      case "/api/fetchFilteredData":
        return fetchJsonResponse({ data: [JANE], totalRecords: 1 });
      case "/api/committee/eligibility":
        return fetchJsonResponse(ELIGIBLE);
      case "/api/committee/add":
        return addMember(server, JSON.parse(String(init?.body)) as Parameters<typeof addMember>[1]);
      case "/api/committee/remove": {
        if (server.removeGate) await server.removeGate;
        const { memberId } = JSON.parse(String(init?.body)) as { memberId: string };
        return removeMember(server, memberId);
      }
    }
    throw new Error(`unexpected fetch ${url.toString()}`);
  });
}

function renderWorkspace(query: string) {
  mockUrl.reset(query);
  return render(
    <GlobalContext.Provider
      value={{ actingPermissions: PrivilegeLevel.Admin, setActingPermissions: () => undefined }}
    >
      <CommitteeWorkspace termLabel="2024–2026" initialScope={null} />
    </GlobalContext.Provider>,
  );
}

const committeeList = () => screen.getByRole("complementary", { name: "Committee list" });
const detailPane = () => screen.getByRole("region", { name: "Committee detail" });
const queryRow = (id: number) =>
  committeeList().querySelector<HTMLElement>(`[data-committee-id="${id}"]`);
const selectedRowIds = () =>
  Array.from(committeeList().querySelectorAll('[aria-current="true"]')).map((el) =>
    Number(el.getAttribute("data-committee-id")),
  );
const urlNow = () => mockUrl.get().toString();
const drawer = () => screen.getByRole("dialog");

async function waitForGrid() {
  await waitFor(() => expect(screen.queryByText("Loading committees…")).not.toBeInTheDocument());
}

/** Opens a vacant seat's drawer from its Add member button. */
async function openVacantSeatAdd(seat: number) {
  await userEvent.click(
    within(detailPane()).getByRole("button", { name: `Add member for seat ${seat}` }),
  );
  await screen.findByRole("dialog");
}

async function openRowAction(trigger: string, item: string) {
  await userEvent.click(within(detailPane()).getByRole("button", { name: trigger }));
  await userEvent.click(await screen.findByRole("menuitem", { name: item }));
  await screen.findByRole("dialog");
}

/** Search, pick Jane, accept the defaults and add her. */
async function addJane() {
  await userEvent.click(within(drawer()).getByRole("button", { name: "Search" }));
  await userEvent.click(await within(drawer()).findByRole("button", { name: "Select Jane Doe" }));
  await within(drawer()).findByText("Eligibility Snapshot");
  await userEvent.click(within(drawer()).getByRole("button", { name: "Continue" }));
  await userEvent.click(within(drawer()).getByRole("button", { name: "Continue" }));
  await userEvent.click(within(drawer()).getByRole("button", { name: "Add member" }));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(hasPermissionFor)
    .mockImplementation(
      jest.requireActual<typeof UtilsModule>("~/lib/utils").hasPermissionFor,
    );
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn((query: string) => ({
      matches: true,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
});

// --- Tests ---------------------------------------------------------------------

describe("Action drawer in the workspace", () => {
  it("adds a member from a vacant seat and refreshes both panes, keeping selection, tab and filters", async () => {
    const fetchMock = serve(newServer());
    renderWorkspace("committee=2&tab=roster&town=GREECE");
    await waitForGrid();
    await within(detailPane()).findByRole("button", { name: "Add member for seat 2" });
    expect(queryRow(2)).toHaveTextContent("1/4");
    const query = urlNow();

    await openVacantSeatAdd(2);
    expect(within(drawer()).getByRole("heading", { level: 2, name: "Add member" })).toBeInTheDocument();
    await addJane();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(toast).toHaveBeenCalledWith({
      title: "Success",
      description: "Committee member added successfully",
    });
    // Both panes reflect the add.
    await waitFor(() => expect(queryRow(2)).toHaveTextContent("2/4"));
    expect(await within(detailPane()).findByText("Jane Doe")).toBeInTheDocument();
    const add = fetchMock.mock.calls.find(([input]) => String(input) === "/api/committee/add");
    expect(JSON.parse(String(add![1]!.body))).toMatchObject({
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 2,
      memberId: "V-JANE",
    });

    // Nothing the user chose moved.
    expect(selectedRowIds()).toEqual([2]);
    expect(screen.getByRole("tab", { name: "Roster" })).toHaveAttribute("aria-selected", "true");
    expect(queryRow(3)).not.toBeInTheDocument(); // town filter still applied
    expect(urlNow()).toBe(query);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("returns focus to the row's action trigger on Escape and opens fresh the next time", async () => {
    serve(newServer());
    renderWorkspace("committee=2&tab=roster");
    await waitForGrid();
    const trigger = await within(detailPane()).findByRole("button", { name: "Add member for seat 3" });

    await openVacantSeatAdd(3);
    await userEvent.click(within(drawer()).getByRole("button", { name: "Search" }));
    await within(drawer()).findByRole("button", { name: "Select Jane Doe" });
    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());

    await openVacantSeatAdd(3);
    expect(within(drawer()).queryByRole("list", { name: "Candidates" })).not.toBeInTheDocument();
    expect(within(drawer()).getByRole("heading", { level: 3, name: /Find candidate/ })).toBeInTheDocument();
  });

  it("removes a member (ticket 14) and refreshes both panes, returning focus to the row", async () => {
    serve(newServer());
    renderWorkspace("committee=2&tab=roster");
    await waitForGrid();
    await within(detailPane()).findByText("Sam Seated");
    const query = urlNow();

    await openRowAction("Actions for seat 1", "Remove member");
    expect(within(drawer()).getByRole("heading", { level: 2, name: "Remove member" })).toBeInTheDocument();
    await userEvent.selectOptions(within(drawer()).getByLabelText(/Reason for removal/), "DECEASED");
    await userEvent.click(within(drawer()).getByRole("button", { name: "Remove member" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(toast).toHaveBeenCalledWith({
      title: "Success",
      description: "Committee member removed successfully",
    });
    await waitFor(() => expect(queryRow(2)).toHaveTextContent("0/4"));
    await waitFor(() =>
      expect(within(detailPane()).queryByText("Sam Seated")).not.toBeInTheDocument(),
    );
    expect(selectedRowIds()).toEqual([2]);
    expect(urlNow()).toBe(query);
    await waitFor(() =>
      expect(within(detailPane()).getByRole("button", { name: "Add member for seat 1" })).toHaveFocus(),
    );
  });

  it("returns focus to the trigger after a successful add", async () => {
    serve(newServer());
    renderWorkspace("committee=2&tab=roster");
    await waitForGrid();
    await within(detailPane()).findByRole("button", { name: "Add member for seat 2" });

    await openVacantSeatAdd(2);
    await addJane();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // Seat 2 is now occupied, so its Add member button became the row's menu;
    // focus follows to the new control.
    await waitFor(() =>
      expect(within(detailPane()).getByRole("button", { name: "Actions for seat 2" })).toHaveFocus(),
    );
  });

  it("moves focus to the committee heading when the row it came from is gone", async () => {
    const server = newServer();
    server.unassigned.set(2, [person("V-LOOSE", "Lou", "Loose")]);
    server.rollups = server.rollups.map((r) =>
      r.committeeListId === 2 ? { ...r, unassignedCount: 1 } : r,
    );
    serve(server);
    renderWorkspace("committee=2&tab=roster");
    await waitForGrid();
    await within(detailPane()).findByRole("button", { name: "Actions for Lou Loose" });

    await openRowAction("Actions for Lou Loose", "Remove member");
    await userEvent.selectOptions(within(drawer()).getByLabelText(/Reason for removal/), "DECEASED");
    await userEvent.click(within(drawer()).getByRole("button", { name: "Remove member" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(within(detailPane()).queryByRole("button", { name: "Actions for Lou Loose" })).not.toBeInTheDocument(),
    );
    expect(within(detailPane()).getByRole("heading", { level: 2 })).toHaveFocus();
  });

  it("keeps a later drawer open when the refresh after an earlier mutation fails", async () => {
    const server = newServer();
    let release: () => void = () => undefined;
    server.removeGate = new Promise<void>((r) => (release = r));
    serve(server);
    renderWorkspace("committee=2&tab=roster");
    await waitForGrid();
    await within(detailPane()).findByRole("button", { name: "Actions for seat 1" });

    // A removal in flight, closed before it answers.
    await openRowAction("Actions for seat 1", "Remove member");
    await userEvent.selectOptions(within(drawer()).getByLabelText(/Reason for removal/), "DECEASED");
    await userEvent.click(within(drawer()).getByRole("button", { name: "Remove member" }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // Another action, part-filled.
    await openVacantSeatAdd(3);
    await userEvent.type(within(drawer()).getByLabelText("Last name"), "Doe");

    // The removal lands; its refresh fails.
    server.failDetail = true;
    release();
    // (The page behind the open drawer is aria-hidden, so query by text.)
    expect(await screen.findByText(/Could not load this committee/)).toBeInTheDocument();

    expect(within(drawer()).getByRole("heading", { level: 2, name: "Add member" })).toBeInTheDocument();
    expect(within(drawer()).getByLabelText("Last name")).toHaveValue("Doe");
  });
});
