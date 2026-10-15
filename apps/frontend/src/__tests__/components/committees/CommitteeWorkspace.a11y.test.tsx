/**
 * Plan §10 accessibility checks across the whole workspace (ticket 15a):
 * the heading outline on every tab, a keyboard-only path from the committee
 * list through the tabs and a row's action menu into the drawer, the drawer's
 * focus trap / Escape / focus restore, and that every status the workspace
 * shows (loading, errors, warnings, pending, missing weight, petitioned
 * vacancies, selection) is carried by text or ARIA state, not color alone.
 *
 * Layout (no horizontal overflow at 375 / 768 / 1280, full-screen sheet below
 * `md`) can't be measured in jsdom; ticket 15's checklist records the
 * screenshot pass for those.
 *
 * The harness follows `CommitteeWorkspace.drawer.test.tsx`.
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

// --- Fixtures ------------------------------------------------------------------

type Occupant = NonNullable<SeatRosterRow["occupant"]>;

const person = (VRCNUM: string, firstName: string, lastName: string): Occupant => ({
  VRCNUM,
  firstName,
  lastName,
  membershipType: "APPOINTED",
});

function rollup(
  committeeListId: number,
  cityTown: string,
  electionDistrict: number,
  extra: Partial<EdRollup> = {},
): EdRollup {
  return {
    committeeListId,
    cityTown,
    legDistrict: 1,
    electionDistrict,
    filled: 1,
    totalSeats: 4,
    unassignedCount: 0,
    pendingCount: 0,
    designationWeight: null,
    missingWeightSeatNumbers: [],
    ...extra,
  };
}

const ROLLUPS: EdRollup[] = [
  rollup(1, "GREECE", 1),
  // Every flag the grid and summary can show at once.
  rollup(2, "GREECE", 2, {
    pendingCount: 1,
    unassignedCount: 1,
    missingWeightSeatNumbers: [3],
  }),
  rollup(3, "GREECE", 3, { filled: 4 }),
];

const JANE = {
  VRCNUM: "V-JANE",
  firstName: "Jane",
  lastName: "Doe",
  city: "GREECE",
  electionDistrict: 2,
};

function detailFor(r: EdRollup): CommitteeDetailResponse {
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
    { ...base, seatNumber: 1, occupant: person(`V-SAM${r.committeeListId}`, "Sam", "Seated") },
    { ...base, seatNumber: 2, occupant: null },
    { ...base, seatNumber: 3, occupant: null },
    { ...base, seatNumber: 4, occupant: null, petitionedVacant: true },
    ...(r.unassignedCount > 0
      ? [{ ...base, seatNumber: null, unassigned: true, occupant: person("V-LOU", "Lou", "Loose") }]
      : []),
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
      missingWeightSeatNumbers: r.missingWeightSeatNumbers,
    },
    pending: [],
    history: { events: [], hasMore: false },
  };
}

function rosterPage(): RosterResponse {
  return {
    scope: {},
    filters: {
      towns: ["GREECE"],
      legDistricts: [{ cityTown: "GREECE", legDistrict: 1 }],
    },
    edRollups: ROLLUPS,
    summary: summarizeEdRollups(ROLLUPS),
    nextCursor: null,
  };
}

type DetailMode = "ok" | "fail" | "hang";

function serve(detailMode: DetailMode = "ok") {
  return installFetchMock(async (input) => {
    const url = new URL(String(input), "http://localhost");
    const detail = /^\/api\/committee\/(\d+)\/detail$/.exec(url.pathname);
    if (detail) {
      if (detailMode === "fail") return fetchJsonResponse({ error: "Detail unavailable" }, 500);
      if (detailMode === "hang") return new Promise<Response>(() => undefined);
      const r = ROLLUPS.find((x) => x.committeeListId === Number(detail[1]));
      return r ? fetchJsonResponse(detailFor(r)) : fetchJsonResponse({ error: "nope" }, 404);
    }
    switch (url.pathname) {
      case "/api/committee/roster":
        return fetchJsonResponse(rosterPage());
      case "/api/fetchFilteredData":
        return fetchJsonResponse({ data: [JANE], totalRecords: 1 });
      case "/api/committee/history":
        return fetchJsonResponse({ events: [], hasMore: false });
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
const rowFor = (id: number) =>
  committeeList().querySelector<HTMLElement>(`[data-committee-id="${id}"]`)!;
const drawer = () => screen.getByRole("dialog");

async function waitForGrid() {
  await waitFor(() => expect(screen.queryByText("Loading committees…")).not.toBeInTheDocument());
}

/** Heading levels in document order, outside any dialog. */
function pageOutline(): Array<{ level: number; text: string }> {
  return Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"))
    .filter((h) => !h.closest('[role="dialog"]'))
    .map((h) => ({ level: Number(h.tagName[1]), text: h.textContent ?? "" }));
}

/** No level is skipped on the way down (h1 → h3 without an h2, say). */
function expectNoSkippedLevels(outline: Array<{ level: number; text: string }>) {
  let previous = 0;
  for (const { level, text } of outline) {
    if (level > previous + 1) {
      throw new Error(`h${level} "${text}" follows h${previous}`);
    }
    previous = level;
  }
}

/** Tab (forward) until `target` has focus; fails after `max` presses. */
async function tabTo(target: () => HTMLElement | null, max = 40) {
  for (let i = 0; i < max; i++) {
    const el = target();
    if (el && document.activeElement === el) return;
    await userEvent.tab();
  }
  throw new Error(
    `Tab never reached the target; focus is on ${document.activeElement?.outerHTML.slice(0, 120)}`,
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

// --- Headings ------------------------------------------------------------------

describe("Workspace heading hierarchy (plan §10)", () => {
  it.each([
    ["roster", "Roster"],
    ["pending", "Pending"],
    ["seats", "Seats & Weight"],
    ["history", "History"],
  ])("on the %s tab: one h1, the committee as the only h2, tab sections at h3", async (tab) => {
    serve();
    renderWorkspace(`committee=2&tab=${tab}`);
    await waitForGrid();
    const panel = await screen.findByRole("tabpanel");
    await waitFor(() =>
      expect(within(panel).queryByText("Loading committee details…")).not.toBeInTheDocument(),
    );

    const outline = pageOutline();
    expect(outline.filter((h) => h.level === 1).map((h) => h.text)).toEqual(["Committees"]);
    expect(outline.filter((h) => h.level === 2).map((h) => h.text)).toEqual(["Greece · ED 2"]);
    expectNoSkippedLevels(outline);

    // Every heading inside the panel sits below the committee's h2, and the
    // panel's first heading is an h3.
    const panelHeadings = within(panel).getAllByRole("heading");
    expect(panelHeadings.length).toBeGreaterThan(0);
    expect(panelHeadings[0]!.tagName).toBe("H3");
    for (const h of panelHeadings) expect(Number(h.tagName[1])).toBeGreaterThanOrEqual(3);
  });

  it("titles the drawer with its own h2 and its steps with h3", async () => {
    serve();
    renderWorkspace("committee=2&tab=roster");
    await waitForGrid();
    await userEvent.click(
      await within(detailPane()).findByRole("button", { name: "Actions for seat 2" }),
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: "Add member" }));

    const headings = within(await screen.findByRole("dialog")).getAllByRole("heading");
    expect(headings.map((h) => h.tagName)).toEqual(["H2", "H3"]);
    expect(headings[0]).toHaveTextContent("Add member");
  });
});

// --- Keyboard path and drawer focus ---------------------------------------------

describe("Keyboard path through the workspace (plan §10)", () => {
  it("goes from a grid row to the tabs, a row's action menu and the drawer, then back, by keyboard alone", async () => {
    serve();
    renderWorkspace("");
    await waitForGrid();

    // Grid: select a committee with Enter.
    act(() => rowFor(2).focus());
    await userEvent.keyboard("{Enter}");
    expect(mockPush).toHaveBeenCalledTimes(1);
    await within(detailPane()).findByRole("button", { name: "Actions for seat 2" });

    // Tab order leads from the list into the detail's tab strip.
    await tabTo(() => screen.getByRole("tab", { name: "Roster" }));
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Pending" })).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Roster" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Roster" })).toHaveAttribute("aria-selected", "true");
    await within(detailPane()).findByRole("button", { name: "Actions for seat 2" });

    // Into the panel, to a row's action menu.
    const trigger = () =>
      within(detailPane()).queryByRole("button", { name: "Actions for seat 2" });
    await tabTo(trigger);
    await userEvent.keyboard("{Enter}");
    const menu = await screen.findByRole("menu");
    const items = within(menu).getAllByRole("menuitem");
    await waitFor(() => expect(items[0]).toHaveFocus());
    const add = within(menu).getByRole("menuitem", { name: "Add member" });
    while (document.activeElement !== add) await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");

    // The drawer opens with focus inside it.
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    // Escape closes it and focus returns to the row's trigger.
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger()).toHaveFocus());
  });

  it("traps Tab and Shift+Tab inside the drawer", async () => {
    serve();
    renderWorkspace("committee=2&tab=roster");
    await waitForGrid();
    await userEvent.click(
      await within(detailPane()).findByRole("button", { name: "Actions for seat 2" }),
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: "Add member" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    // Cycle more times than there are controls, both ways: focus never leaves.
    const visited = new Set<Element>();
    for (let i = 0; i < 25; i++) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
      visited.add(document.activeElement!);
    }
    for (let i = 0; i < 25; i++) {
      await userEvent.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    // It really cycled (search fields, the checkbox, Search, Cancel, Close).
    expect(visited.size).toBeGreaterThan(3);
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("restores focus to the trigger when the drawer's Close button is used", async () => {
    serve();
    renderWorkspace("committee=2&tab=roster");
    await waitForGrid();
    const trigger = await within(detailPane()).findByRole("button", {
      name: "Actions for seat 3",
    });
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Add member" }));
    await userEvent.click(within(drawer()).getByRole("button", { name: "Close" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

// --- Narrow layouts ---------------------------------------------------------------

describe("Roster on narrow screens (plan §10)", () => {
  it("pins each row's action menu to the table's right edge, so the table's sideways scroll never hides it", async () => {
    serve();
    renderWorkspace("committee=2&tab=roster");
    await waitForGrid();
    const triggers = await within(detailPane()).findAllByRole("button", { name: /^Actions for / });
    for (const trigger of triggers) {
      expect(trigger.closest("td")).toHaveClass("sticky", "right-0");
    }
  });
});

// --- Not color alone ------------------------------------------------------------

describe("Workspace states are not conveyed by color alone (plan §10)", () => {
  it("spells out grid row state and marks the selected row with aria-current", async () => {
    serve();
    renderWorkspace("committee=2");
    await waitForGrid();

    const flagged = rowFor(2);
    expect(flagged).toHaveAttribute("aria-current", "true");
    expect(rowFor(1)).not.toHaveAttribute("aria-current");
    expect(flagged).toHaveTextContent(/1\/4\s*seats filled/);
    expect(flagged).toHaveTextContent(/1\s*pending/);
    expect(flagged).toHaveTextContent("Missing weight");
    expect(flagged).toHaveTextContent(/\+1\s*unassigned/);
    expect(rowFor(3)).toHaveTextContent(/4\/4\s*seats filled/);
    // Town headers summarize in text too.
    expect(committeeList()).toHaveTextContent("3 EDs · 6 open · 1 pending");
  });

  it("spells out the committee summary and petitioned vacancies in text", async () => {
    serve();
    renderWorkspace("committee=2&tab=roster");
    await waitForGrid();
    const summary = await within(detailPane()).findByRole("list", { name: "Committee summary" });
    expect(summary).toHaveTextContent("1 of 4 seats filled · 3 open");
    expect(summary).toHaveTextContent("1 unassigned");
    expect(summary).toHaveTextContent("1 pending");
    expect(summary).toHaveTextContent("LTED weight not set");
    expect(summary).toHaveTextContent("Missing weight: seat 3");
    expect(within(detailPane()).getByText("— petitioned vacant —")).toBeInTheDocument();
    expect(within(detailPane()).getAllByText("— vacant —")).toHaveLength(2);
  });

  it("announces detail loading as a status, in words", async () => {
    serve("hang");
    renderWorkspace("committee=2");
    await waitForGrid();
    expect(await within(detailPane()).findByRole("status")).toHaveTextContent(
      "Loading committee details…",
    );
  });

  it("announces a failed detail as an alert, in words, with Retry", async () => {
    serve("fail");
    renderWorkspace("committee=2");
    await waitForGrid();
    const alert = await within(detailPane()).findByRole("alert");
    expect(alert).toHaveTextContent("Could not load this committee: Detail unavailable");
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
