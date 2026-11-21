/**
 * Member name search in the committees workspace (leader feedback 2026-11-11,
 * ticket 07): who sees the control (acting permissions), how hits replace the
 * grid, and opening a hit's committee, including loosening filters that would
 * hide it. Scope rules live on the server; see memberSearch*.test.ts.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel } from "@prisma/client";

import { CommitteeWorkspace } from "~/app/committees/workspace/CommitteeWorkspace";
import {
  EMPTY_GRID_FILTERS,
  filtersToReveal,
} from "~/app/committees/workspace/gridModel";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPrivilegeFor } from "~/lib/utils";
import type * as UtilsModule from "~/lib/utils";
import {
  fetchJsonResponse as jsonResponse,
  installFetchMock,
  type FetchJsonResponse,
} from "../../utils/mocks";
import { summarizeEdRollups } from "~/lib/summarizeEdRollups";
import type {
  EdRollup,
  MemberSearchHit,
  RosterResponse,
} from "~/lib/validations/committee";

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
      actingPrivilege: "Admin",
      setActingPrivilege: () => undefined,
    }),
  };
});

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
const ROCHESTER_28 = rollup(5, "ROCHESTER", 28, 7);
const ROCHESTER_29 = rollup(6, "ROCHESTER", 29, 7, { filled: 4 });
const ALL = [GREECE_1, ROCHESTER_28, ROCHESTER_29];

const ROSTER: RosterResponse = {
  scope: {},
  filters: {
    towns: ["GREECE", "ROCHESTER"],
    legDistricts: [
      { cityTown: "GREECE", legDistrict: 1 },
      { cityTown: "ROCHESTER", legDistrict: 28 },
      { cityTown: "ROCHESTER", legDistrict: 29 },
    ],
  },
  edRollups: ALL,
  summary: summarizeEdRollups(ALL),
  nextCursor: null,
};

function hit(
  r: EdRollup,
  firstName: string,
  lastName: string,
  status: MemberSearchHit["status"] = "active",
): MemberSearchHit {
  return {
    membershipId: `m-${firstName}`,
    committeeListId: r.committeeListId,
    firstName,
    lastName,
    status,
    cityTown: r.cityTown,
    legDistrict: r.legDistrict,
    electionDistrict: r.electionDistrict,
  };
}

const HITS = [
  hit(GREECE_1, "Jane", "Smith"),
  hit(ROCHESTER_29, "John", "Smith", "pending"),
];

function serve(
  searchResponse: () => FetchJsonResponse = () =>
    jsonResponse({ hits: HITS, truncated: false }),
) {
  return installFetchMock(async (input) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname === "/api/committee/roster") return jsonResponse(ROSTER);
    if (url.pathname === "/api/committee/memberSearch") return searchResponse();
    const detail = /^\/api\/committee\/(\d+)\/detail$/.exec(url.pathname);
    if (detail) return jsonResponse({ error: "not in this test" }, 404);
    throw new Error(`unexpected fetch ${url.toString()}`);
  });
}

const searchRequests = (fetchMock: ReturnType<typeof serve>) =>
  fetchMock.mock.calls
    .map(([input]) => new URL(String(input), "http://localhost"))
    .filter((u) => u.pathname === "/api/committee/memberSearch")
    .map((u) => u.searchParams.get("q"));

function renderWorkspace(role: PrivilegeLevel, query = "") {
  mockUrl.reset(query);
  return render(
    <GlobalContext.Provider
      value={{ actingPrivilege: role, setActingPrivilege: () => undefined }}
    >
      <CommitteeWorkspace termLabel="2024–2026" initialScope={null} />
    </GlobalContext.Provider>,
  );
}

const list = () =>
  screen.getByRole("complementary", { name: "Committee list" });
const searchBox = () =>
  screen.getByRole("searchbox", { name: "Find a member by name" });
const lastPush = () => {
  const href = mockPush.mock.calls.at(-1)?.[0];
  return href ? new URL(href, "http://localhost").searchParams : null;
};

async function waitForGrid() {
  await waitFor(() =>
    expect(list().querySelector(`[data-committee-id="1"]`)).toBeInTheDocument(),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(hasPrivilegeFor)
    .mockImplementation(
      jest.requireActual<typeof UtilsModule>("~/lib/utils").hasPrivilegeFor,
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

describe("member search visibility", () => {
  it.each([
    PrivilegeLevel.Leader,
    PrivilegeLevel.Admin,
    PrivilegeLevel.Developer,
  ])("shows the name search to %s", async (role) => {
    serve();
    renderWorkspace(role);
    await waitForGrid();
    expect(searchBox()).toBeInTheDocument();
  });

  it.each([PrivilegeLevel.ReadAccess, PrivilegeLevel.RequestAccess])(
    "hides it from %s (acting permissions)",
    async (role) => {
      serve();
      renderWorkspace(role);
      await waitForGrid();
      expect(
        screen.queryByRole("searchbox", { name: "Find a member by name" }),
      ).not.toBeInTheDocument();
    },
  );
});

describe("member search results", () => {
  it("does not query for one letter and shows a hint instead of the grid", async () => {
    const fetchMock = serve();
    renderWorkspace(PrivilegeLevel.Leader);
    await waitForGrid();
    await userEvent.type(searchBox(), "s,,");
    expect(
      await within(list()).findByText("Type at least 2 letters of a name."),
    ).toBeInTheDocument();
    expect(
      list().querySelector(`[data-committee-id="1"]`),
    ).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 300));
    expect(searchRequests(fetchMock)).toEqual([]);
  });

  it("shows hits with town, LD and ED, marks pending, and restores the grid when cleared", async () => {
    const fetchMock = serve();
    renderWorkspace(PrivilegeLevel.Leader);
    await waitForGrid();
    await userEvent.type(searchBox(), "smi");

    const members = await within(list()).findByRole("list", {
      name: "Members",
    });
    const items = within(members).getAllByRole("button");
    expect(items.map((b) => b.textContent)).toEqual([
      "Jane SmithGreece · LD 1 · ED 1Active",
      "John SmithRochester · LD 29 · ED 7Pending",
    ]);
    expect(searchRequests(fetchMock)).toEqual(["smi"]);
    expect(within(list()).getByRole("status")).toHaveTextContent(
      "2 members found",
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Clear member search" }),
    );
    expect(searchBox()).toHaveValue("");
    await waitForGrid();
  });

  it("clears with Escape", async () => {
    serve();
    renderWorkspace(PrivilegeLevel.Leader);
    await waitForGrid();
    await userEvent.type(searchBox(), "smi");
    await within(list()).findByRole("list", { name: "Members" });
    await userEvent.type(searchBox(), "{Escape}");
    expect(searchBox()).toHaveValue("");
    await waitForGrid();
  });

  it("says so when nothing matches, and when the search fails", async () => {
    let fail = false;
    serve(() =>
      fail
        ? jsonResponse({ error: "boom" }, 500)
        : jsonResponse({ hits: [], truncated: false }),
    );
    renderWorkspace(PrivilegeLevel.Leader);
    await waitForGrid();
    await userEvent.type(searchBox(), "zz");
    expect(
      await within(list()).findByText("No members match “zz”."),
    ).toBeInTheDocument();
    fail = true;
    await userEvent.type(searchBox(), "q");
    expect(
      await within(list()).findByText(
        "Could not search members: Search failed (status 500)",
      ),
    ).toBeInTheDocument();
  });

  it("notes when results were capped", async () => {
    serve(() => jsonResponse({ hits: HITS, truncated: true }));
    renderWorkspace(PrivilegeLevel.Leader);
    await waitForGrid();
    await userEvent.type(searchBox(), "smi");
    expect(
      await within(list()).findByText(/Showing the first 25/),
    ).toBeInTheDocument();
  });
});

describe("opening a hit", () => {
  it("pushes the hit's committee and keeps the results", async () => {
    serve();
    renderWorkspace(PrivilegeLevel.Leader);
    await waitForGrid();
    await userEvent.type(searchBox(), "smi");
    const jane = await within(list()).findByRole("button", {
      name: /Jane Smith/,
    });
    await userEvent.click(jane);
    expect(lastPush()?.get("committee")).toBe("1");
    await waitFor(() =>
      expect(
        within(list()).getByRole("button", { name: /Jane Smith/ }),
      ).toHaveAttribute("aria-current", "true"),
    );
  });

  it("drops a town / LD filter that would hide the hit's committee", async () => {
    serve();
    renderWorkspace(PrivilegeLevel.Admin, "town=ROCHESTER&ld=28");
    await waitFor(() =>
      expect(
        list().querySelector(`[data-committee-id="5"]`),
      ).toBeInTheDocument(),
    );
    await userEvent.type(searchBox(), "smi");
    await userEvent.click(
      await within(list()).findByRole("button", { name: /Jane Smith/ }),
    );
    const pushed = lastPush();
    expect(pushed?.get("committee")).toBe("1");
    expect(pushed?.get("town")).toBeNull();
    expect(pushed?.get("ld")).toBeNull();
  });

  it("drops only the LD when the town already matches", async () => {
    serve();
    renderWorkspace(PrivilegeLevel.Admin, "town=ROCHESTER&ld=28");
    await waitFor(() =>
      expect(
        list().querySelector(`[data-committee-id="5"]`),
      ).toBeInTheDocument(),
    );
    await userEvent.type(searchBox(), "smi");
    await userEvent.click(
      await within(list()).findByRole("button", { name: /John Smith/ }),
    );
    const pushed = lastPush();
    expect(pushed?.get("committee")).toBe("6");
    expect(pushed?.get("town")).toBe("ROCHESTER");
    expect(pushed?.get("ld")).toBeNull();
  });
});

describe("filtersToReveal", () => {
  const target = { cityTown: "ROCHESTER", legDistrict: 29 };

  it("changes nothing when the filters already show the committee", () => {
    expect(
      filtersToReveal(target, ROCHESTER_29, {
        ...EMPTY_GRID_FILTERS,
        town: "ROCHESTER",
      }),
    ).toEqual({ resetLocal: false });
  });

  it("resets local filters that hide it", () => {
    expect(
      filtersToReveal(target, ROCHESTER_29, {
        ...EMPTY_GRID_FILTERS,
        onlyOpenSeats: true,
      }),
    ).toEqual({ resetLocal: true });
  });

  it("drops town and LD when the town differs", () => {
    expect(
      filtersToReveal(target, ROCHESTER_29, {
        ...EMPTY_GRID_FILTERS,
        town: "GREECE",
        ld: 1,
      }),
    ).toEqual({ town: null, ld: null, resetLocal: true });
  });

  it("drops only the LD when the town matches", () => {
    expect(
      filtersToReveal(target, ROCHESTER_29, {
        ...EMPTY_GRID_FILTERS,
        town: "ROCHESTER",
        ld: 28,
      }),
    ).toEqual({ ld: null, resetLocal: true });
  });

  it("resets local filters when the row is not loaded yet", () => {
    expect(filtersToReveal(target, undefined, EMPTY_GRID_FILTERS)).toEqual({
      resetLocal: true,
    });
  });
});
