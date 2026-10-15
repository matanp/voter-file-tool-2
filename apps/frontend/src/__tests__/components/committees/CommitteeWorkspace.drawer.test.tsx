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

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    headers: { get: () => "application/json" },
    json: async () => body,
  } as unknown as Response;
}

type Occupant = SeatRosterRow["occupant"];

type Server = {
  rollups: EdRollup[];
  /** committeeListId → occupant per seat (index = seat - 1). */
  seats: Map<number, Occupant[]>;
};

function newServer(): Server {
  const sam = (VRCNUM: string): Occupant => ({
    VRCNUM,
    firstName: "Sam",
    lastName: "Seated",
    membershipType: "APPOINTED",
  });
  return {
    rollups: [rollup(1, "GREECE", 1, 1), rollup(2, "GREECE", 1, 2), rollup(3, "PENFIELD", 2, 1)],
    seats: new Map([
      [1, [sam("V-SAM1"), null, null, null]],
      [2, [sam("V-SAM2"), null, null, null]],
      [3, [sam("V-SAM3"), null, null, null]],
    ]),
  };
}

function detailFor(server: Server, r: EdRollup): CommitteeDetailResponse {
  const rows: SeatRosterRow[] = (server.seats.get(r.committeeListId) ?? []).map(
    (occupant, i) => ({
      committeeListId: r.committeeListId,
      cityTown: r.cityTown,
      legDistrict: r.legDistrict,
      electionDistrict: r.electionDistrict,
      seatNumber: i + 1,
      isPetitioned: false,
      weight: null,
      occupant,
      contact: { email: null, phone: null },
    }),
  );
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

function serve(server: Server) {
  const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    const detail = /^\/api\/committee\/(\d+)\/detail$/.exec(url.pathname);
    if (detail) {
      const r = server.rollups.find((x) => x.committeeListId === Number(detail[1]));
      return r ? jsonResponse(detailFor(server, r)) : jsonResponse({ error: "nope" }, 404);
    }
    switch (url.pathname) {
      case "/api/committee/roster":
        return jsonResponse(rosterPage(server));
      case "/api/fetchFilteredData":
        return jsonResponse({ data: [JANE], totalRecords: 1 });
      case "/api/committee/eligibility":
        return jsonResponse(ELIGIBLE);
      case "/api/committee/add": {
        const body = JSON.parse(String(init?.body)) as {
          cityTown: string;
          legDistrict?: number;
          electionDistrict: number;
          memberId: string;
        };
        const r = server.rollups.find(
          (x) =>
            x.cityTown === body.cityTown &&
            x.legDistrict === body.legDistrict &&
            x.electionDistrict === body.electionDistrict,
        );
        if (!r) return jsonResponse({ success: false, error: "Committee not found" }, 404);
        const seats = server.seats.get(r.committeeListId)!;
        seats[seats.indexOf(null)] = {
          VRCNUM: body.memberId,
          firstName: "Jane",
          lastName: "Doe",
          membershipType: "APPOINTED",
        };
        server.rollups = server.rollups.map((x) =>
          x === r ? { ...x, filled: x.filled + 1 } : x,
        );
        return jsonResponse({ success: true, message: "Member added to committee" });
      }
    }
    throw new Error(`unexpected fetch ${url.toString()}`);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
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
    await within(detailPane()).findByRole("button", { name: "Actions for seat 2" });
    expect(queryRow(2)).toHaveTextContent("1/4");
    const query = urlNow();

    await openRowAction("Actions for seat 2", "Add member");
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
    const trigger = await within(detailPane()).findByRole("button", { name: "Actions for seat 3" });

    await openRowAction("Actions for seat 3", "Add member");
    await userEvent.click(within(drawer()).getByRole("button", { name: "Search" }));
    await within(drawer()).findByRole("button", { name: "Select Jane Doe" });
    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());

    await openRowAction("Actions for seat 3", "Add member");
    expect(within(drawer()).queryByRole("list", { name: "Candidates" })).not.toBeInTheDocument();
    expect(within(drawer()).getByRole("heading", { level: 3, name: /Find candidate/ })).toBeInTheDocument();
  });

  it("returns focus to the trigger after a successful add", async () => {
    serve(newServer());
    renderWorkspace("committee=2&tab=roster");
    await waitForGrid();
    await within(detailPane()).findByRole("button", { name: "Actions for seat 2" });

    await openRowAction("Actions for seat 2", "Add member");
    await addJane();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // Seat 2 is now occupied; its trigger keeps the seat's accessible name.
    await waitFor(() =>
      expect(within(detailPane()).getByRole("button", { name: "Actions for seat 2" })).toHaveFocus(),
    );
  });
});
