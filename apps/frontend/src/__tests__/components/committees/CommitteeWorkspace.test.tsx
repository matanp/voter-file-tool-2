/**
 * Committees workspace shell (ticket 07, plan §6 / §12.2): URL-driven selection
 * and tabs, filtering, invalid-selection recovery, cursor pagination, the
 * Leader single-scope shortcut, and role-gated header controls.
 *
 * `next/navigation` is backed by a tiny in-memory URL store: router writes
 * update it and `useSearchParams` re-renders from it, like the real router.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel } from "@prisma/client";

import { CommitteeWorkspace } from "~/app/committees/workspace/CommitteeWorkspace";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import type * as UtilsModule from "~/lib/utils";
import { summarizeEdRollups } from "~/lib/summarizeEdRollups";
import type {
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

/** Serves `pages` keyed by cursor (`null` = first page). */
function serveRoster(pages: RosterResponse[]) {
  const byCursor = new Map<string, RosterResponse>();
  let cursor: number | null = null;
  for (const page of pages) {
    byCursor.set(String(cursor), page);
    cursor = page.nextCursor;
  }
  const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname !== "/api/committee/roster") {
      throw new Error(`unexpected fetch ${url.toString()}`);
    }
    const page = byCursor.get(String(url.searchParams.get("cursor")));
    return page ? jsonResponse(page) : jsonResponse({ error: "bad cursor" }, 400);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
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

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const urls = fetchMock.mock.calls.map(([u]) => new URL(String(u), "http://localhost"));
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
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const cursor = new URL(String(input), "http://localhost").searchParams.get("cursor");
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
    const fetchMock = jest.fn(async () =>
      fail ? jsonResponse({ error: "boom" }, 500) : jsonResponse(pages[0]),
    );
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
});
