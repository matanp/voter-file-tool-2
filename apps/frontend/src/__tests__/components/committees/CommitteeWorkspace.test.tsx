/**
 * Committees workspace shell (tickets 07 and 08, plan §6 / §10 / §12.2):
 * URL-driven selection and tabs, filtering, invalid-selection recovery, cursor
 * pagination, the Leader single-scope shortcut, role-gated controls, detail
 * loading and failure, stale detail requests, empty scopes, the list collapse
 * toggle, mobile list ↔ detail navigation, and keyboard access.
 *
 * `next/navigation` is backed by a tiny in-memory URL store: router writes
 * update it and `useSearchParams` re-renders from it, like the real router.
 */
import React from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel } from "@prisma/client";

import { CommitteeWorkspace } from "~/app/committees/workspace/CommitteeWorkspace";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import type * as UtilsModule from "~/lib/utils";
import { summarizeEdRollups } from "~/lib/summarizeEdRollups";
import type {
  CommitteeDetailResponse,
  EdRollup,
  RosterFilters,
  RosterResponse,
} from "~/lib/validations/committee";
import type { CommitteeScope } from "~/app/committees/committeeScope";

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

// --- Fixtures ------------------------------------------------------------------

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

const GREECE_1 = rollup(1, "GREECE", 1, 1);
const GREECE_2 = rollup(2, "GREECE", 1, 2, { pendingCount: 2 });
const PENFIELD_1 = rollup(3, "PENFIELD", 2, 1);
const PENFIELD_2 = rollup(4, "PENFIELD", 2, 2, { filled: 4 });
const ROCHESTER_28 = rollup(5, "ROCHESTER", 28, 7);
const ROCHESTER_29 = rollup(6, "ROCHESTER", 29, 7);
const ALL = [GREECE_1, GREECE_2, PENFIELD_1, PENFIELD_2, ROCHESTER_28, ROCHESTER_29];

function filtersFor(rollups: EdRollup[]): RosterFilters {
  const towns = Array.from(new Set(rollups.map((r) => r.cityTown)));
  const pairs = new Map<string, { cityTown: string; legDistrict: number }>();
  for (const r of rollups) {
    pairs.set(`${r.cityTown}|${r.legDistrict}`, {
      cityTown: r.cityTown,
      legDistrict: r.legDistrict,
    });
  }
  return { towns, legDistricts: Array.from(pairs.values()) };
}

/** Splits the scope into pages the way the roster endpoint's cursor does. */
function pagesOf(rollups: EdRollup[], pageSize: number): RosterResponse[] {
  const pages: RosterResponse[] = [];
  for (let i = 0; i < rollups.length || i === 0; i += pageSize) {
    const page = rollups.slice(i, i + pageSize);
    const more = i + pageSize < rollups.length;
    pages.push({
      scope: {},
      filters: filtersFor(rollups),
      edRollups: page,
      summary: summarizeEdRollups(rollups),
      nextCursor: more ? (page[page.length - 1]?.committeeListId ?? null) : null,
    });
  }
  return pages;
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: async () => body,
  } as unknown as Response;
}

/** A detail response for a grid row; `ltedWeight` doubles as a visible marker. */
function detailFor(
  r: EdRollup,
  overrides: Partial<CommitteeDetailResponse> = {},
): CommitteeDetailResponse {
  return {
    committee: {
      committeeListId: r.committeeListId,
      cityTown: r.cityTown,
      legDistrict: r.legDistrict,
      electionDistrict: r.electionDistrict,
      termId: "term-1",
      ltedWeight: `${r.committeeListId}.5`,
    },
    term: {
      id: "term-1",
      label: "2024–2026",
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
    },
    maxSeatsPerLted: 4,
    rollup: r,
    rows: [],
    designationWeightSummary: {
      totalWeight: 0,
      totalContributingSeats: 0,
      seats: [],
      missingWeightSeatNumbers: [],
    },
    pending: [],
    history: { events: [], hasMore: false },
    ...overrides,
  };
}

type DetailHandler = (
  committeeListId: number,
  init: RequestInit | undefined,
) => Promise<Response>;

const DETAIL_PATH = /^\/api\/committee\/(\d+)\/detail$/;

/** Serves the scope's detail from `rollups`; unknown ids get the endpoint's 404. */
function detailsFrom(rollups: EdRollup[]): DetailHandler {
  return async (id) => {
    const r = rollups.find((x) => x.committeeListId === id);
    return r
      ? jsonResponse(detailFor(r))
      : jsonResponse({ error: "Committee not found" }, 404);
  };
}

/**
 * Serves roster `pages` keyed by cursor (`null` = first page), and the detail
 * endpoint through `detail` (default: built from the pages' rollups).
 */
function serveRoster(pages: RosterResponse[], detail?: DetailHandler) {
  const byCursor = new Map<string, RosterResponse>();
  let cursor: number | null = null;
  for (const page of pages) {
    byCursor.set(String(cursor), page);
    cursor = page.nextCursor;
  }
  const serveDetail = detail ?? detailsFrom(pages.flatMap((p) => p.edRollups));
  const fetchMock = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      const detailMatch = DETAIL_PATH.exec(url.pathname);
      if (detailMatch) return serveDetail(Number(detailMatch[1]), init);
      if (url.pathname !== "/api/committee/roster") {
        throw new Error(`unexpected fetch ${url.toString()}`);
      }
      const page = byCursor.get(String(url.searchParams.get("cursor")));
      return page ? jsonResponse(page) : jsonResponse({ error: "bad cursor" }, 400);
    },
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

/** Detail requests made so far, as `[committeeListId, init]`. */
function detailRequests(fetchMock: jest.Mock) {
  return fetchMock.mock.calls.flatMap(
    ([input, init]: [RequestInfo | URL, RequestInit | undefined]) => {
      const match = DETAIL_PATH.exec(new URL(String(input), "http://localhost").pathname);
      return match ? [[Number(match[1]), init] as const] : [];
    },
  );
}

/** A promise the test resolves by hand. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function renderWorkspace({
  query = "",
  role = PrivilegeLevel.Admin,
  initialScope = null,
}: {
  query?: string;
  role?: PrivilegeLevel;
  initialScope?: CommitteeScope | null;
} = {}) {
  mockUrl.reset(query);
  return render(
    <GlobalContext.Provider
      value={{ actingPermissions: role, setActingPermissions: () => undefined }}
    >
      <CommitteeWorkspace termLabel="2024–2026" initialScope={initialScope} />
    </GlobalContext.Provider>,
  );
}

const committeeList = () => screen.getByRole("complementary", { name: "Committee list" });
const detailPane = () => screen.getByRole("region", { name: "Committee detail" });
const fixture = (committeeListId: number) => {
  const r = ALL.find((x) => x.committeeListId === committeeListId);
  if (!r) throw new Error(`no fixture ${committeeListId}`);
  return r;
};
const rowFor = (r: EdRollup) => {
  const row = committeeList().querySelector<HTMLButtonElement>(
    `[data-committee-id="${r.committeeListId}"]`,
  );
  if (!row) throw new Error(`row ${r.committeeListId} not rendered`);
  return row;
};
const queryRow = (r: EdRollup) =>
  committeeList().querySelector(`[data-committee-id="${r.committeeListId}"]`);
const selectedRowIds = () =>
  Array.from(committeeList().querySelectorAll('[aria-current="true"]')).map(
    (el) => Number(el.getAttribute("data-committee-id")),
  );
const lastWrite = (mock: jest.Mock<void, [string]>) => {
  const href = mock.mock.calls.at(-1)?.[0];
  return href ? new URL(href, "http://localhost").searchParams : null;
};

async function waitForGrid() {
  await waitFor(() => expect(screen.queryByText("Loading committees…")).not.toBeInTheDocument());
  await waitFor(() =>
    expect(screen.queryByText("Loading more committees…")).not.toBeInTheDocument(),
  );
}

function setViewport(desktop: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn((query: string) => ({
      matches: desktop,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(hasPermissionFor)
    .mockImplementation(
      jest.requireActual<typeof UtilsModule>("~/lib/utils").hasPermissionFor,
    );
  setViewport(true);
});

// --- URL-driven selection and tabs -------------------------------------------

describe("CommitteeWorkspace URL-driven selection", () => {
  it("restores an accessible committee from the URL without rewriting it", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=3" });
    await waitForGrid();

    expect(selectedRowIds()).toEqual([3]);
    expect(screen.getByRole("heading", { level: 2, name: "Penfield · ED 1" })).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("selects the first visible committee on desktop when the URL has none, without writing it", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace();
    await waitForGrid();

    expect(selectedRowIds()).toEqual([1]);
    expect(screen.getByRole("heading", { level: 2, name: "Greece · ED 1" })).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("starts on the list with nothing selected on mobile when the URL has no committee", async () => {
    setViewport(false);
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace();
    await waitForGrid();

    expect(selectedRowIds()).toEqual([]);
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(committeeList()).not.toHaveClass("hidden");
  });

  it("opens the detail view on mobile when the URL carries a valid committee", async () => {
    setViewport(false);
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=2" });
    await waitForGrid();

    expect(screen.getByRole("heading", { level: 2, name: "Greece · ED 2" })).toBeInTheDocument();
    expect(committeeList()).toHaveClass("hidden");
  });

  it("pushes committee selection and keeps the other params", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "town=PENFIELD&tab=seats" });
    await waitForGrid();

    await userEvent.click(rowFor(PENFIELD_2));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    const written = lastWrite(mockPush);
    expect(written?.get("committee")).toBe("4");
    expect(written?.get("town")).toBe("PENFIELD");
    expect(written?.get("tab")).toBe("seats");
    expect(selectedRowIds()).toEqual([4]);
  });

  it("reads the tab from the URL and replaces it on tab change", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=1&tab=history" });
    await waitForGrid();

    expect(screen.getByRole("tab", { name: "History" })).toHaveAttribute("aria-selected", "true");

    await userEvent.click(screen.getByRole("tab", { name: "Pending" }));

    expect(mockPush).not.toHaveBeenCalled();
    expect(lastWrite(mockReplace)?.get("tab")).toBe("pending");
    expect(lastWrite(mockReplace)?.get("committee")).toBe("1");
    expect(screen.getByRole("tab", { name: "Pending" })).toHaveAttribute("aria-selected", "true");
  });

  it("falls back to the roster tab for an unknown tab value", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=1&tab=bogus" });
    await waitForGrid();

    expect(screen.getByRole("tab", { name: "Roster" })).toHaveAttribute("aria-selected", "true");
  });
});

// --- Filtering ---------------------------------------------------------------

describe("CommitteeWorkspace filtering", () => {
  it("applies the town filter from the URL", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "town=GREECE" });
    await waitForGrid();

    expect(queryRow(GREECE_1)).toBeInTheDocument();
    expect(queryRow(GREECE_2)).toBeInTheDocument();
    expect(queryRow(PENFIELD_1)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Town")).toHaveValue("GREECE");
  });

  it("applies town + LD for a multi-LD town and offers only that town's LDs", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "town=ROCHESTER&ld=29" });
    await waitForGrid();

    expect(queryRow(ROCHESTER_29)).toBeInTheDocument();
    expect(queryRow(ROCHESTER_28)).not.toBeInTheDocument();
    const ldOptions = within(screen.getByLabelText("Legislative district"))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(ldOptions).toEqual(["All LDs", "LD 28", "LD 29"]);
  });

  it("replaces town in the URL (dropping LD) when the town filter changes", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "town=ROCHESTER&ld=28" });
    await waitForGrid();

    await userEvent.selectOptions(screen.getByLabelText("Town"), "PENFIELD");

    expect(mockPush).not.toHaveBeenCalled();
    const written = lastWrite(mockReplace);
    expect(written?.get("town")).toBe("PENFIELD");
    expect(written?.has("ld")).toBe(false);
    expect(queryRow(PENFIELD_1)).toBeInTheDocument();
    expect(queryRow(ROCHESTER_28)).not.toBeInTheDocument();
  });

  it("applies local quick filters without touching the URL", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace();
    await waitForGrid();

    await userEvent.click(screen.getByRole("button", { name: "Pending" }));

    expect(queryRow(GREECE_2)).toBeInTheDocument();
    expect(queryRow(GREECE_1)).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
    // Desktop fallback follows the visible rows.
    expect(selectedRowIds()).toEqual([2]);
  });

  it("filters by ED number from the search box", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace();
    await waitForGrid();

    await userEvent.type(screen.getByLabelText("Search by ED number or town"), "7");

    expect(queryRow(ROCHESTER_28)).toBeInTheDocument();
    expect(queryRow(ROCHESTER_29)).toBeInTheDocument();
    expect(queryRow(GREECE_1)).not.toBeInTheDocument();
  });

  it("collapses and expands a town section", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace();
    await waitForGrid();

    const toggle = screen.getByRole("button", { name: /Greece/, expanded: true });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(queryRow(GREECE_1)).not.toBeInTheDocument();
    await userEvent.click(toggle);
    expect(queryRow(GREECE_1)).toBeInTheDocument();
  });
});

// --- Invalid-selection recovery ----------------------------------------------

describe("CommitteeWorkspace invalid-selection recovery", () => {
  it("clears a committee the caller cannot see and falls back to the first visible row", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=999&tab=pending" });
    await waitForGrid();

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    const written = lastWrite(mockReplace);
    expect(written?.has("committee")).toBe(false);
    expect(written?.get("tab")).toBe("pending");
    expect(selectedRowIds()).toEqual([1]);
  });

  it("clears a URL committee that the URL's own filters hide", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=1&town=PENFIELD" });
    await waitForGrid();

    await waitFor(() => expect(lastWrite(mockReplace)?.has("committee")).toBe(false));
    expect(lastWrite(mockReplace)?.get("town")).toBe("PENFIELD");
    expect(selectedRowIds()).toEqual([3]);
  });

  it("clears the selection when a filter change hides it", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=1" });
    await waitForGrid();
    expect(selectedRowIds()).toEqual([1]);

    await userEvent.selectOptions(screen.getByLabelText("Town"), "PENFIELD");

    await waitFor(() => expect(lastWrite(mockReplace)?.has("committee")).toBe(false));
    expect(lastWrite(mockReplace)?.get("town")).toBe("PENFIELD");
    expect(selectedRowIds()).toEqual([3]);
  });

  it("keeps the selection when a filter change still shows it", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=2" });
    await waitForGrid();

    await userEvent.selectOptions(screen.getByLabelText("Town"), "GREECE");

    expect(lastWrite(mockReplace)?.get("committee")).toBe("2");
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(selectedRowIds()).toEqual([2]);
  });

  it("clears the selection when a local quick filter hides it", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=1" });
    await waitForGrid();

    await userEvent.click(screen.getByRole("button", { name: "Pending" }));

    await waitFor(() => expect(lastWrite(mockReplace)?.has("committee")).toBe(false));
    expect(selectedRowIds()).toEqual([2]);
  });

  it("drops a town (and its LD) outside the caller's scope", async () => {
    serveRoster(pagesOf([GREECE_1, GREECE_2], 500));
    renderWorkspace({ query: "town=PENFIELD&ld=2&committee=1" });
    await waitForGrid();

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    const written = lastWrite(mockReplace);
    expect(written?.has("town")).toBe(false);
    expect(written?.has("ld")).toBe(false);
    // The committee is in scope once the bogus town is ignored, so it stays.
    expect(written?.get("committee")).toBe("1");
    expect(selectedRowIds()).toEqual([1]);
  });

  it("returns to the list on mobile when the URL committee is invalid", async () => {
    setViewport(false);
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=999" });
    await waitForGrid();

    await waitFor(() => expect(lastWrite(mockReplace)?.has("committee")).toBe(false));
    expect(committeeList()).not.toHaveClass("hidden");
    expect(selectedRowIds()).toEqual([]);
  });
});

// --- Pagination --------------------------------------------------------------

describe("CommitteeWorkspace pagination", () => {
  it("drains every cursor page and groups rows by town across pages", async () => {
    const fetchMock = serveRoster(pagesOf(ALL, 3));
    renderWorkspace();
    await waitForGrid();

    const urls = fetchMock.mock.calls
      .map(([u]) => new URL(String(u), "http://localhost"))
      .filter((u) => u.pathname === "/api/committee/roster");
    expect(urls).toHaveLength(2);
    expect(urls[0]?.searchParams.get("includeRows")).toBe("false");
    expect(urls[0]?.searchParams.has("cursor")).toBe(false);
    expect(urls[1]?.searchParams.get("cursor")).toBe("3");
    for (const r of ALL) expect(queryRow(r)).toBeInTheDocument();
    // PENFIELD straddles the page boundary but renders as one section.
    expect(screen.getAllByRole("button", { name: /Penfield/, expanded: true })).toHaveLength(1);
  });

  it("keeps a URL committee from a later page while earlier pages load, then selects it", async () => {
    const [first, second] = pagesOf(ALL, 3);
    let releaseSecond: () => void = () => undefined;
    const secondGate = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    const detailGate = deferred<void>();
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      if (DETAIL_PATH.test(url.pathname)) {
        await detailGate.promise;
        return jsonResponse(detailFor(ROCHESTER_29));
      }
      const cursor = url.searchParams.get("cursor");
      if (cursor === null) return jsonResponse(first);
      await secondGate;
      return jsonResponse(second);
    }) as unknown as typeof fetch;
    renderWorkspace({ query: "committee=6" });

    // First page shown, committee 6 not loaded yet: the selection must hold.
    expect(await screen.findByText("Loading more committees…")).toBeInTheDocument();
    expect(queryRow(GREECE_1)).toBeInTheDocument();
    expect(screen.getByText("Loading committee…")).toBeInTheDocument();
    expect(selectedRowIds()).toEqual([]);
    expect(mockReplace).not.toHaveBeenCalled();

    // The detail endpoint identifies the committee before its grid page arrives.
    detailGate.resolve();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Rochester · ED 7" }),
    ).toBeInTheDocument();
    expect(selectedRowIds()).toEqual([]);

    releaseSecond();
    await waitForGrid();

    expect(mockReplace).not.toHaveBeenCalled();
    expect(selectedRowIds()).toEqual([6]);
    expect(screen.getByRole("heading", { level: 2, name: "Rochester · ED 7" })).toBeInTheDocument();
  });

  it("shows header counts from the scope-wide summary", async () => {
    serveRoster(pagesOf(ALL, 2));
    renderWorkspace();

    // 6 EDs, 24 seats, 14 filled → 10 open; 2 pending.
    expect(await screen.findByText(/6 committees · 10 open seats · 2 pending/)).toBeInTheDocument();
  });

  it("shows an error with a working retry when the grid fails to load", async () => {
    const pages = pagesOf(ALL, 500);
    let fail = true;
    const serveDetail = detailsFrom(ALL);
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      const detailMatch = DETAIL_PATH.exec(url.pathname);
      if (detailMatch) return serveDetail(Number(detailMatch[1]), undefined);
      return fail ? jsonResponse({ error: "boom" }, 500) : jsonResponse(pages[0]);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    renderWorkspace();

    expect(await screen.findByRole("alert")).toHaveTextContent("boom");
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(queryRow(GREECE_1)).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// --- Leader shortcut and role-gated header -----------------------------------

describe("CommitteeWorkspace roles", () => {
  it("applies a Leader's single (town, LD) scope when the URL has no filters", async () => {
    serveRoster(pagesOf([ROCHESTER_28], 500));
    renderWorkspace({
      role: PrivilegeLevel.Leader,
      initialScope: { cityTown: "ROCHESTER", legDistrict: 28 },
    });
    await waitForGrid();

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const written = lastWrite(mockReplace);
    expect(written?.get("town")).toBe("ROCHESTER");
    expect(written?.get("ld")).toBe("28");
    expect(screen.getByLabelText("Town")).toHaveValue("ROCHESTER");
    expect(selectedRowIds()).toEqual([5]);
  });

  it("does not override filters already in the URL with the Leader scope", async () => {
    serveRoster(pagesOf([ROCHESTER_28, ROCHESTER_29], 500));
    renderWorkspace({
      query: "town=ROCHESTER&ld=29",
      role: PrivilegeLevel.Leader,
      initialScope: { cityTown: "ROCHESTER", legDistrict: 28 },
    });
    await waitForGrid();

    expect(mockReplace).not.toHaveBeenCalled();
    expect(queryRow(ROCHESTER_29)).toBeInTheDocument();
  });

  it("shows Admin shortcuts by acting permissions and hides them for a Leader", async () => {
    serveRoster(pagesOf(ALL, 500));
    const { unmount } = renderWorkspace({ role: PrivilegeLevel.Admin });
    await waitForGrid();
    expect(screen.getByRole("link", { name: "Review pending" })).toHaveAttribute(
      "href",
      "/committees/requests",
    );
    expect(screen.getByRole("link", { name: "Generate report" })).toBeInTheDocument();
    unmount();

    renderWorkspace({ role: PrivilegeLevel.Leader });
    await waitForGrid();
    expect(screen.queryByRole("link", { name: "Review pending" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Generate report" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Committees" })).toBeInTheDocument();
  });

  it("follows actingPermissions in the UI but never sends it with the detail request", async () => {
    const fetchMock = serveRoster(pagesOf(ALL, 500));
    // e.g. a Developer acting as a Leader.
    const { unmount } = renderWorkspace({ query: "committee=1", role: PrivilegeLevel.Leader });
    await within(detailPane()).findByText("LTED weight 1.5");
    expect(screen.queryByRole("link", { name: "Review pending" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Roster",
      "Pending",
      "Seats & Weight",
      "History",
    ]);
    const leaderInit = detailRequests(fetchMock)[0]?.[1];
    unmount();

    renderWorkspace({ query: "committee=1", role: PrivilegeLevel.Developer });
    await within(detailPane()).findByText("LTED weight 1.5");
    expect(screen.getByRole("link", { name: "Review pending" })).toBeInTheDocument();
    const developerInit = detailRequests(fetchMock)[1]?.[1];

    // Authorization is the server's: the request is the same for every acting role.
    expect(developerInit?.headers).toEqual(leaderInit?.headers);
    expect(developerInit?.method).toBe(leaderInit?.method);
    expect(JSON.stringify(leaderInit?.headers ?? {})).not.toMatch(/Leader|Admin|Developer/i);
  });
});

// --- Detail loading (ticket 08) ----------------------------------------------

describe("CommitteeWorkspace detail loading", () => {
  it("loads the selected committee's detail and renders the summary and the default Roster tab", async () => {
    const fetchMock = serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=2" });
    await waitForGrid();

    expect(await within(detailPane()).findByText("LTED weight 2.5")).toBeInTheDocument();
    expect(detailRequests(fetchMock).map(([id]) => id)).toEqual([2]);
    const summary = within(detailPane()).getByRole("list", { name: "Committee summary" });
    expect(summary).toHaveTextContent("2 of 4 seats filled · 2 open");
    expect(summary).toHaveTextContent("2 pending");
    expect(screen.getByRole("tab", { name: "Roster" })).toHaveAttribute("aria-selected", "true");
    expect(
      within(screen.getByRole("tabpanel")).getByRole("heading", { level: 3, name: "Roster" }),
    ).toBeInTheDocument();
  });

  it("shows the committee heading from the grid row while the detail is loading", async () => {
    const gate = deferred<void>();
    serveRoster(pagesOf(ALL, 500), async (id) => {
      await gate.promise;
      return jsonResponse(detailFor(fixture(id)));
    });
    renderWorkspace({ query: "committee=3" });
    await waitForGrid();

    expect(screen.getByRole("heading", { level: 2, name: "Penfield · ED 1" })).toBeInTheDocument();
    expect(within(detailPane()).getByRole("status")).toHaveTextContent("Loading committee details…");
    expect(screen.getByRole("tab", { name: "Roster" })).toBeInTheDocument();

    gate.resolve();
    expect(await within(detailPane()).findByText("LTED weight 3.5")).toBeInTheDocument();
    expect(within(detailPane()).queryByText("Loading committee details…")).not.toBeInTheDocument();
  });

  it("shows a failed detail with the server's message and retries it", async () => {
    let fail = true;
    const fetchMock = serveRoster(pagesOf(ALL, 500), async (id) =>
      fail
        ? jsonResponse({ error: "You do not have access to this committee" }, 403)
        : jsonResponse(detailFor(fixture(id))),
    );
    renderWorkspace({ query: "committee=1" });
    await waitForGrid();

    const alert = await within(detailPane()).findByRole("alert");
    expect(alert).toHaveTextContent(
      "Could not load this committee: You do not have access to this committee",
    );
    // The header still identifies the committee from the grid row.
    expect(screen.getByRole("heading", { level: 2, name: "Greece · ED 1" })).toBeInTheDocument();

    fail = false;
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));

    expect(await within(detailPane()).findByText("LTED weight 1.5")).toBeInTheDocument();
    expect(within(detailPane()).queryByRole("alert")).not.toBeInTheDocument();
    expect(detailRequests(fetchMock).map(([id]) => id)).toEqual([1, 1]);
  });

  it("treats a malformed detail response as a failure", async () => {
    serveRoster(pagesOf(ALL, 500), async () => jsonResponse({ committee: null }));
    renderWorkspace({ query: "committee=1" });
    await waitForGrid();

    expect(await within(detailPane()).findByRole("alert")).toHaveTextContent(
      "Could not load this committee",
    );
  });

  it("aborts a pending request and ignores its late response when the selection changes", async () => {
    const gates = new Map([
      [1, deferred<void>()],
      [2, deferred<void>()],
    ]);
    // Resolves even after abort, as a response already in flight can.
    const fetchMock = serveRoster(pagesOf(ALL, 500), async (id) => {
      await gates.get(id)?.promise;
      return jsonResponse(detailFor(fixture(id)));
    });
    renderWorkspace({ query: "committee=1" });
    await waitForGrid();
    await waitFor(() => expect(detailRequests(fetchMock)).toHaveLength(1));

    await userEvent.click(rowFor(GREECE_2));
    await waitFor(() => expect(detailRequests(fetchMock)).toHaveLength(2));
    const [first, second] = detailRequests(fetchMock);
    expect(first?.[1]?.signal?.aborted).toBe(true);
    expect(second?.[0]).toBe(2);
    expect(second?.[1]?.signal?.aborted).toBe(false);

    // Committee 1 answers first: it must not appear under committee 2.
    await act(async () => {
      gates.get(1)?.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("heading", { level: 2, name: "Greece · ED 2" })).toBeInTheDocument();
    expect(within(detailPane()).getByRole("status")).toHaveTextContent(
      "Loading committee details…",
    );
    expect(within(detailPane()).queryByText("LTED weight 1.5")).not.toBeInTheDocument();

    gates.get(2)?.resolve();
    expect(await within(detailPane()).findByText("LTED weight 2.5")).toBeInTheDocument();
    expect(within(detailPane()).queryByText("LTED weight 1.5")).not.toBeInTheDocument();
  });

  it("keeps the newer committee when the older response arrives last", async () => {
    const gates = new Map([
      [1, deferred<void>()],
      [2, deferred<void>()],
    ]);
    const fetchMock = serveRoster(pagesOf(ALL, 500), async (id) => {
      await gates.get(id)?.promise;
      return jsonResponse(detailFor(fixture(id)));
    });
    renderWorkspace({ query: "committee=1" });
    await waitForGrid();

    await userEvent.click(rowFor(GREECE_2));
    await waitFor(() => expect(detailRequests(fetchMock)).toHaveLength(2));
    gates.get(2)?.resolve();
    expect(await within(detailPane()).findByText("LTED weight 2.5")).toBeInTheDocument();

    await act(async () => {
      gates.get(1)?.resolve();
      await Promise.resolve();
    });
    expect(within(detailPane()).getByText("LTED weight 2.5")).toBeInTheDocument();
    expect(within(detailPane()).queryByText("LTED weight 1.5")).not.toBeInTheDocument();
  });

  it("renders each tab's registered component in a labelled tabpanel", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=1" });
    await waitForGrid();
    await within(detailPane()).findByText("LTED weight 1.5");

    for (const name of ["Pending", "Seats & Weight", "History", "Roster"]) {
      await userEvent.click(screen.getByRole("tab", { name }));
      const panel = screen.getByRole("tabpanel");
      expect(within(panel).getByRole("heading", { level: 3, name })).toBeInTheDocument();
      expect(panel).toHaveAttribute("aria-labelledby", screen.getByRole("tab", { name }).id);
    }
  });
});

// --- Empty scopes ----------------------------------------------------------------

describe("CommitteeWorkspace empty scopes", () => {
  it("tells an Admin the term has no committees and requests no detail", async () => {
    const fetchMock = serveRoster(pagesOf([], 500));
    renderWorkspace({ role: PrivilegeLevel.Admin });

    expect(
      await screen.findByRole("heading", { level: 2, name: "No committees to show" }),
    ).toBeInTheDocument();
    expect(screen.getByText("The 2024–2026 term has no committees yet.")).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Committee list" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(detailRequests(fetchMock)).toEqual([]);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("tells a Leader with no jurisdiction in the term that nothing is assigned", async () => {
    serveRoster(pagesOf([], 500));
    renderWorkspace({ role: PrivilegeLevel.Leader });

    expect(
      await screen.findByText(
        "You have no committees assigned for the 2024–2026 term. An Admin can assign you a jurisdiction.",
      ),
    ).toBeInTheDocument();
  });

  it("clears a URL committee when the scope is empty", async () => {
    serveRoster(pagesOf([], 500));
    renderWorkspace({ query: "committee=4", role: PrivilegeLevel.Leader });

    expect(await screen.findByText(/no committees assigned/)).toBeInTheDocument();
    await waitFor(() => expect(lastWrite(mockReplace)?.has("committee")).toBe(false));
  });
});

// --- Layout, navigation, and keyboard access -------------------------------------

describe("CommitteeWorkspace layout and keyboard access", () => {
  it("has one h1 and one h2 for the selected committee", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=4" });
    await waitForGrid();

    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual([
      "Committees",
    ]);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Penfield · ED 2",
    ]);
  });

  it("moves between tabs with the arrow keys and writes the tab with replace", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=1" });
    await waitForGrid();
    await within(detailPane()).findByText("LTED weight 1.5");

    act(() => screen.getByRole("tab", { name: "Roster" }).focus());
    await userEvent.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Pending" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Pending" })).toHaveAttribute("aria-selected", "true");
    expect(lastWrite(mockReplace)?.get("tab")).toBe("pending");

    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "History" })).toHaveFocus();
    expect(lastWrite(mockReplace)?.get("tab")).toBe("history");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("selects a committee row from the keyboard", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace();
    await waitForGrid();

    act(() => rowFor(PENFIELD_1).focus());
    await userEvent.keyboard("{Enter}");

    expect(lastWrite(mockPush)?.get("committee")).toBe("3");
    expect(await within(detailPane()).findByText("LTED weight 3.5")).toBeInTheDocument();
  });

  it("collapses and restores the committee list with a toggle, keeping focus on it", async () => {
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace({ query: "committee=1" });
    await waitForGrid();

    await userEvent.click(screen.getByRole("button", { name: "Hide committee list" }));
    expect(committeeList()).toHaveClass("md:hidden");
    const show = screen.getByRole("button", { name: "Show committee list" });
    expect(show).toHaveAttribute("aria-expanded", "false");
    expect(show).toHaveAttribute("aria-controls", committeeList().id);
    expect(show).toHaveFocus();
    // The selection and URL are untouched.
    expect(screen.getByRole("heading", { level: 2, name: "Greece · ED 1" })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    await userEvent.click(show);
    expect(committeeList()).toHaveClass("md:flex");
    expect(committeeList()).not.toHaveClass("md:hidden");
    expect(screen.queryByRole("button", { name: "Show committee list" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide committee list" })).toHaveFocus();
  });

  it("on mobile, opens the detail with focus on its heading, and Back returns focus to the row", async () => {
    setViewport(false);
    serveRoster(pagesOf(ALL, 500));
    renderWorkspace();
    await waitForGrid();
    expect(detailPane()).toHaveClass("hidden");

    await userEvent.click(rowFor(PENFIELD_2));

    expect(lastWrite(mockPush)?.get("committee")).toBe("4");
    expect(committeeList()).toHaveClass("hidden");
    expect(detailPane()).not.toHaveClass("hidden");
    expect(screen.getByRole("heading", { level: 2, name: "Penfield · ED 2" })).toHaveFocus();
    await within(detailPane()).findByText("LTED weight 4.5");

    await userEvent.click(within(detailPane()).getByRole("button", { name: "Back to committees" }));

    expect(lastWrite(mockReplace)?.has("committee")).toBe(false);
    expect(committeeList()).not.toHaveClass("hidden");
    expect(selectedRowIds()).toEqual([]);
    expect(rowFor(PENFIELD_2)).toHaveFocus();
  });
});
