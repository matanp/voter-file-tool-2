/**
 * Cross-pane refresh (ticket 10): deciding a pending submission in the Pending
 * tab refreshes both the detail and the affected grid row, while selection,
 * tab and filters stay put — no URL write, no grid loading flash, and the
 * selected committee stays listed even when a quick filter would now hide it.
 *
 * The harness follows `CommitteeWorkspace.test.tsx` (in-memory URL router,
 * GlobalContext with `actingPermissions`), with a small stateful server:
 * `handleRequest` removes the submission and lowers the row's `pendingCount`.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel } from "@prisma/client";

import { CommitteeWorkspace } from "~/app/committees/workspace/CommitteeWorkspace";
import { keepRowVisible } from "~/app/committees/workspace/useGridRefresh";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import type * as UtilsModule from "~/lib/utils";
import { summarizeEdRollups } from "~/lib/summarizeEdRollups";
import type {
  CommitteeDetailResponse,
  EdRollup,
  PendingMembership,
  RosterResponse,
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

// --- Fixtures and a stateful fake server ------------------------------------------

function rollup(
  committeeListId: number,
  cityTown: string,
  legDistrict: number,
  electionDistrict: number,
  overrides: Partial<EdRollup> = {},
): EdRollup {
  return {
    committeeListId,
    cityTown,
    legDistrict,
    electionDistrict,
    filled: 2,
    totalSeats: 4,
    unassignedCount: 0,
    pendingCount: 0,
    designationWeight: null,
    missingWeightSeatNumbers: [],
    ...overrides,
  };
}

function submission(membershipId: string, firstName: string): PendingMembership {
  return {
    membershipId,
    voterRecordId: `VR-${membershipId}`,
    firstName,
    lastName: "Doe",
    submittedAt: "2026-03-02T15:00:00.000Z",
    isOwnSubmission: false,
    replacementFor: null,
    submittedBy: { id: "u-1", name: "Lee Leader" },
    eligibilityWarnings: [],
    contact: { email: null, phone: null },
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

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

type Server = {
  rollups: EdRollup[];
  pending: Map<number, PendingMembership[]>;
  /** While set, roster requests after the first page wait on it (to observe the grid mid-drain). */
  rosterGate: Promise<void> | null;
  /** While set, roster requests after the first page fail with a 500. */
  failLaterPages?: boolean;
};

function detailFor(server: Server, r: EdRollup): CommitteeDetailResponse {
  return {
    committee: {
      committeeListId: r.committeeListId,
      cityTown: r.cityTown,
      legDistrict: r.legDistrict,
      electionDistrict: r.electionDistrict,
      termId: "term-1",
      ltedWeight: null,
      assemblyDistrict: "134",
    },
    term: {
      id: "term-1",
      label: "2024–2026",
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
    },
    maxSeatsPerLted: 4,
    requireAssemblyDistrictMatch: true,
    rollup: r,
    rows: [],
    designationWeightSummary: {
      totalWeight: 0,
      totalContributingSeats: 0,
      seats: [],
      missingWeightSeatNumbers: [],
    },
    pending: server.pending.get(r.committeeListId) ?? [],
    history: { events: [], hasMore: false },
  };
}

/** Roster pages of `pageSize`, keyed by cursor like the endpoint's. */
function rosterPage(server: Server, cursor: number | null, pageSize: number): RosterResponse {
  const start =
    cursor === null ? 0 : server.rollups.findIndex((r) => r.committeeListId === cursor) + 1;
  const page = server.rollups.slice(start, start + pageSize);
  const more = start + pageSize < server.rollups.length;
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
    edRollups: page,
    summary: summarizeEdRollups(server.rollups),
    nextCursor: more ? (page[page.length - 1]?.committeeListId ?? null) : null,
  };
}

function serve(server: Server, pageSize = 500) {
  const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    const detail = /^\/api\/committee\/(\d+)\/detail$/.exec(url.pathname);
    if (detail) {
      const r = server.rollups.find((x) => x.committeeListId === Number(detail[1]));
      return r ? jsonResponse(detailFor(server, r)) : jsonResponse({ error: "nope" }, 404);
    }
    if (url.pathname === "/api/committee/roster") {
      const cursor = url.searchParams.get("cursor");
      if (cursor !== null && server.rosterGate) await server.rosterGate;
      if (cursor !== null && server.failLaterPages) {
        return jsonResponse({ error: "Gateway timeout" }, 500);
      }
      return jsonResponse(rosterPage(server, cursor === null ? null : Number(cursor), pageSize));
    }
    if (url.pathname === "/api/committee/handleRequest") {
      const { membershipId } = JSON.parse(String(init?.body)) as { membershipId: string };
      for (const [committeeListId, list] of server.pending) {
        if (!list.some((p) => p.membershipId === membershipId)) continue;
        server.pending.set(
          committeeListId,
          list.filter((p) => p.membershipId !== membershipId),
        );
        server.rollups = server.rollups.map((r) =>
          r.committeeListId === committeeListId
            ? { ...r, pendingCount: r.pendingCount - 1 }
            : r,
        );
        return jsonResponse({ message: "Request rejected" });
      }
      return jsonResponse({ error: "Committee membership request not found" }, 404);
    }
    throw new Error(`unexpected fetch ${url.toString()}`);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const rosterCalls = (fetchMock: jest.Mock) =>
  fetchMock.mock.calls.filter(([input]) =>
    String(input).startsWith("/api/committee/roster"),
  ).length;

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

async function waitForGrid() {
  await waitFor(() => expect(screen.queryByText("Loading committees…")).not.toBeInTheDocument());
  await waitFor(() =>
    expect(screen.queryByText("Loading more committees…")).not.toBeInTheDocument(),
  );
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

describe("Pending tab cross-pane refresh", () => {
  it("refreshes the detail and the grid row after a decision, keeping selection, tab and filters", async () => {
    const server: Server = {
      rollups: [
        rollup(1, "GREECE", 1, 1),
        rollup(2, "GREECE", 1, 2, { pendingCount: 2 }),
        rollup(3, "PENFIELD", 2, 1),
      ],
      pending: new Map([[2, [submission("m-1", "Jane"), submission("m-2", "John")]]]),
      rosterGate: null,
    };
    const fetchMock = serve(server);
    renderWorkspace("committee=2&tab=pending&town=GREECE");
    await waitForGrid();
    await within(detailPane()).findByRole("listitem", { name: /Jane Doe/ });
    expect(queryRow(2)).toHaveTextContent("2 pending");
    const query = urlNow();
    const rosterBefore = rosterCalls(fetchMock);

    await userEvent.click(screen.getByRole("button", { name: "Reject Jane Doe" }));

    // The grid row and the detail both reflect the decision.
    await waitFor(() => expect(queryRow(2)).toHaveTextContent("1 pending"));
    await waitFor(() =>
      expect(within(detailPane()).queryByRole("listitem", { name: /Jane Doe/ })).not.toBeInTheDocument(),
    );
    expect(within(detailPane()).getByRole("listitem", { name: /John Doe/ })).toBeInTheDocument();
    expect(within(detailPane()).getByRole("status")).toHaveTextContent("Rejected Jane Doe.");
    expect(rosterCalls(fetchMock)).toBe(rosterBefore + 1);

    // Nothing the user chose moved.
    expect(selectedRowIds()).toEqual([2]);
    expect(screen.getByRole("tab", { name: "Pending" })).toHaveAttribute("aria-selected", "true");
    expect(queryRow(3)).not.toBeInTheDocument(); // town filter still applied
    expect(urlNow()).toBe(query);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("keeps the grid on screen while a multi-page refresh drains, and keeps a row the Pending filter would now hide", async () => {
    const server: Server = {
      rollups: [
        rollup(1, "GREECE", 1, 1),
        rollup(2, "GREECE", 1, 2, { pendingCount: 1 }),
        rollup(3, "PENFIELD", 2, 1),
        rollup(4, "PENFIELD", 2, 2, { pendingCount: 1 }),
        rollup(5, "ROCHESTER", 28, 7, { pendingCount: 3 }),
      ],
      pending: new Map([[4, [submission("m-4", "Jane")]]]),
      rosterGate: null,
    };
    const fetchMock = serve(server, 2);
    renderWorkspace("committee=4&tab=pending");
    await waitForGrid();
    await userEvent.click(screen.getByRole("button", { name: "Pending" })); // quick filter
    expect(queryRow(1)).not.toBeInTheDocument();
    await within(detailPane()).findByRole("listitem", { name: /Jane Doe/ });
    const query = urlNow();

    const gate = deferred();
    server.rosterGate = gate.promise;
    const rosterBefore = rosterCalls(fetchMock);
    await userEvent.click(screen.getByRole("button", { name: "Reject Jane Doe" }));
    await waitFor(() =>
      expect(within(detailPane()).queryByRole("listitem", { name: /Jane Doe/ })).not.toBeInTheDocument(),
    );
    // The refresh has served page 1 and is waiting on page 2.
    await waitFor(() => expect(rosterCalls(fetchMock)).toBe(rosterBefore + 2));

    // Mid-drain: the previous complete grid stays, with no loading state.
    const scroller = queryRow(4)?.closest("[aria-busy]");
    expect(scroller).toHaveAttribute("aria-busy", "false");
    expect(screen.queryByText("Loading committees…")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading more committees…")).not.toBeInTheDocument();
    expect([2, 4, 5].map((id) => queryRow(id) !== null)).toEqual([true, true, true]);
    expect(queryRow(4)).toHaveTextContent("1 pending");
    expect(selectedRowIds()).toEqual([4]);

    server.rosterGate = null;
    gate.resolve();

    // The row updates and stays listed (and selected) although it has no pending left.
    await waitFor(() => expect(queryRow(4)).not.toHaveTextContent("pending"));
    expect(queryRow(2)).toBeInTheDocument();
    expect(queryRow(5)).toBeInTheDocument();
    expect(selectedRowIds()).toEqual([4]);
    expect(screen.getByRole("tab", { name: "Pending" })).toHaveAttribute("aria-selected", "true");
    expect(urlNow()).toBe(query);
    expect(mockReplace).not.toHaveBeenCalled();

    // Changing a filter drops the pin, so the filters apply normally again.
    await userEvent.click(screen.getByRole("button", { name: "Pending" }));
    await userEvent.click(screen.getByRole("button", { name: "Pending" }));
    await waitFor(() => expect(queryRow(4)).not.toBeInTheDocument());
  });

  it("keeps every row of the last complete grid when a refresh fails after page 1", async () => {
    const server: Server = {
      rollups: [
        rollup(1, "GREECE", 1, 1),
        rollup(2, "GREECE", 1, 2),
        rollup(3, "PENFIELD", 2, 1, { pendingCount: 1 }),
        rollup(4, "ROCHESTER", 28, 7),
      ],
      pending: new Map([[3, [submission("m-3", "Jane")]]]),
      rosterGate: null,
    };
    const fetchMock = serve(server, 2);
    renderWorkspace("committee=3&tab=pending");
    await waitForGrid();
    await within(detailPane()).findByRole("listitem", { name: /Jane Doe/ });
    expect([1, 2, 3, 4].map((id) => queryRow(id) !== null)).toEqual([true, true, true, true]);

    server.failLaterPages = true;
    const rosterBefore = rosterCalls(fetchMock);
    await userEvent.click(screen.getByRole("button", { name: "Reject Jane Doe" }));

    // Page 1 of the refresh loaded, page 2 failed.
    await waitFor(() => expect(rosterCalls(fetchMock)).toBe(rosterBefore + 2));
    const alert = await within(committeeList()).findByRole("alert");
    expect(alert).toHaveTextContent("Could not load committees: Gateway timeout");
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect([1, 2, 3, 4].map((id) => queryRow(id) !== null)).toEqual([true, true, true, true]);
    expect(selectedRowIds()).toEqual([3]);

    // Retry drains every page and swaps in the fresh grid.
    server.failLaterPages = false;
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(within(committeeList()).queryByRole("alert")).not.toBeInTheDocument(),
    );
    await waitForGrid();
    expect([1, 2, 3, 4].map((id) => queryRow(id) !== null)).toEqual([true, true, true, true]);
    expect(queryRow(3)).not.toHaveTextContent("pending");
  });
});

describe("keepRowVisible", () => {
  const a = rollup(1, "GREECE", 1, 1);
  const b = rollup(2, "GREECE", 1, 2);
  const c = rollup(3, "GREECE", 1, 3);

  it("returns the filtered rows unchanged when the committee is listed or unknown", () => {
    const visible = [a, c];
    expect(keepRowVisible(visible, [a, b, c], 1)).toBe(visible);
    expect(keepRowVisible(visible, [a, b, c], 9)).toBe(visible);
    expect(keepRowVisible(visible, [a, b, c], null)).toBe(visible);
  });

  it("inserts a hidden committee in grid order", () => {
    expect(keepRowVisible([a, c], [a, b, c], 2)).toEqual([a, b, c]);
  });
});
