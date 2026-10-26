/**
 * Workspace Roster tab (ticket 09, plan §7.1): the seat table, the Admin-only
 * contact column, the petitioned-vacancy distinction, and the role-gated row
 * action menu that dispatches plan §8 action objects without opening anything.
 * Roles are simulated through `actingPermissions`, as in the workspace test.
 */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel } from "@prisma/client";

import { RosterTab } from "~/app/committees/workspace/tabs/RosterTab";
import type { CommitteeActionHandler } from "~/app/committees/workspace/committeeAction";
import { GlobalContext } from "~/components/providers/GlobalContext";
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

// --- Fixtures ------------------------------------------------------------------

const KEY = {
  committeeListId: 7,
  cityTown: "GREECE",
  legDistrict: 1,
  electionDistrict: 5,
};

function row(overrides: Partial<SeatRosterRow>): SeatRosterRow {
  return {
    ...KEY,
    seatNumber: 1,
    isPetitioned: false,
    weight: null,
    occupant: null,
    ...overrides,
  };
}

const JANE = row({
  seatNumber: 1,
  isPetitioned: true,
  occupant: {
    VRCNUM: "V1",
    firstName: "Jane",
    lastName: "Doe",
    membershipType: "PETITIONED",
  },
  contact: { email: "jane@example.com", phone: "555-1111" },
});
const VACANT = row({ seatNumber: 2 });
const PETITIONED_VACANT = row({
  seatNumber: 3,
  isPetitioned: true,
  petitionedVacant: true,
});
const SAM_UNASSIGNED = row({
  seatNumber: null,
  unassigned: true,
  occupant: {
    VRCNUM: "V9",
    firstName: "Sam",
    lastName: "Loose",
    membershipType: "APPOINTED",
  },
  contact: { email: null, phone: null },
});

/** Contact present, as the endpoint serializes it for an Admin. */
const ADMIN_ROWS = [PETITIONED_VACANT, SAM_UNASSIGNED, VACANT, JANE];

/** As the endpoint serializes it below Admin: no `contact` key at all. */
function withoutContact(rows: SeatRosterRow[]): SeatRosterRow[] {
  return rows.map(({ contact: _contact, ...rest }) => rest);
}

function detailWith(rows: SeatRosterRow[]): CommitteeDetailResponse {
  return {
    committee: { ...KEY, termId: "term-1", ltedWeight: null, assemblyDistrict: "134" },
    term: {
      id: "term-1",
      label: "2024–2026",
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
    },
    maxSeatsPerLted: 4,
    requireAssemblyDistrictMatch: true,
    rollup: {
      ...KEY,
      filled: 1,
      totalSeats: 3,
      unassignedCount: 1,
      pendingCount: 0,
      designationWeight: null,
      missingWeightSeatNumbers: [],
    },
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

function renderRoster({
  role,
  rows = role === PrivilegeLevel.Admin || role === PrivilegeLevel.Developer
    ? ADMIN_ROWS
    : withoutContact(ADMIN_ROWS),
  onAction,
}: {
  role: PrivilegeLevel;
  rows?: SeatRosterRow[];
  onAction?: CommitteeActionHandler;
}) {
  return render(
    <GlobalContext.Provider
      value={{ actingPermissions: role, setActingPermissions: () => undefined }}
    >
      <RosterTab
        committeeId={KEY.committeeListId}
        detail={detailWith(rows)}
        onRefresh={jest.fn()}
        onAction={onAction}
      />
    </GlobalContext.Provider>,
  );
}

/** The row's menu trigger or single-action button, dispatched as where to return focus. */
const trigger = (name: string) => screen.getByRole("button", { name });
const table = () =>
  screen.getByRole("table", { name: "Seats for GREECE LD 1 ED 5" });
const bodyRows = () => within(table()).getAllByRole("row").slice(1);
const rowWith = (text: string) => {
  const match = bodyRows().find((r) => within(r).queryByText(text));
  if (!match) throw new Error(`no row with ${text}`);
  return match;
};

async function menuItemsFor(triggerName: string): Promise<string[]> {
  await userEvent.click(screen.getByRole("button", { name: triggerName }));
  const menu = await screen.findByRole("menu");
  return within(menu)
    .getAllByRole("menuitem")
    .map((item) => item.textContent ?? "");
}

const REF = {
  committeeListId: 7,
  cityTown: "GREECE",
  legDistrict: 1,
  electionDistrict: 5,
  assemblyDistrict: "134",
};

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(hasPermissionFor)
    .mockImplementation(
      jest.requireActual<typeof UtilsModule>("~/lib/utils").hasPermissionFor,
    );
});

// --- Seat table ------------------------------------------------------------------

describe("RosterTab seat table", () => {
  it("renders an h3 and seats in seat order, then unassigned members", () => {
    renderRoster({ role: PrivilegeLevel.Leader });

    expect(
      screen.getByRole("heading", { level: 3, name: "Roster" }),
    ).toBeInTheDocument();
    const cells = bodyRows().map((r) =>
      within(r)
        .getAllByRole("cell")
        .slice(0, 2)
        .map((c) => c.textContent),
    );
    expect(cells).toEqual([
      ["1", "Jane Doe"],
      ["2", "— vacant —Submit candidate"],
      ["3", "— petitioned vacant —Submit candidate"],
      ["Unassigned"],
      ["—", "Sam Loose"],
    ]);
  });

  it("has no ED column (the committee is the scope)", () => {
    renderRoster({ role: PrivilegeLevel.Leader });
    const headers = within(table())
      .getAllByRole("columnheader")
      .map((h) => h.textContent);
    expect(headers.slice(0, 2)).toEqual(["Seat", "Member"]);
    expect(headers).not.toContain("ED");
  });

  it("hides the membership type column for now", () => {
    renderRoster({ role: PrivilegeLevel.Leader });
    const headers = within(table())
      .getAllByRole("columnheader")
      .map((h) => h.textContent);
    expect(headers).not.toContain("Type");
    expect(screen.queryByText("Petitioned")).not.toBeInTheDocument();
    expect(screen.queryByText("Appointed")).not.toBeInTheDocument();
  });

  it("distinguishes a petitioned vacancy in text and with a highlight", () => {
    renderRoster({ role: PrivilegeLevel.Leader });
    expect(rowWith("— petitioned vacant —")).toHaveClass("bg-amber-50");
    expect(rowWith("— vacant —")).not.toHaveClass("bg-amber-50");
  });

  it("says so when the committee has no rows", () => {
    renderRoster({ role: PrivilegeLevel.Admin, rows: [] });
    expect(
      screen.getByText("This committee has no seats or members yet."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

// --- Contact (Admin only, plan §3.10) --------------------------------------------

describe("RosterTab contact info", () => {
  it("shows email and phone to an Admin", () => {
    renderRoster({ role: PrivilegeLevel.Admin });
    expect(
      within(table()).getByRole("columnheader", { name: "Contact" }),
    ).toBeInTheDocument();
    expect(
      within(rowWith("Jane Doe")).getByText("jane@example.com"),
    ).toBeInTheDocument();
    expect(
      within(rowWith("Jane Doe")).getByText("555-1111"),
    ).toBeInTheDocument();
  });

  it("has no contact column for a Leader (the server omits contact)", () => {
    renderRoster({ role: PrivilegeLevel.Leader });
    expect(
      within(table()).queryByRole("columnheader", { name: "Contact" }),
    ).not.toBeInTheDocument();
  });

  it("hides contact from a Developer acting as Leader even when the detail carries it", () => {
    renderRoster({ role: PrivilegeLevel.Leader, rows: ADMIN_ROWS });
    expect(
      within(table()).queryByRole("columnheader", { name: "Contact" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument();
  });

  it("has no contact column for an Admin when no row carries contact", () => {
    renderRoster({
      role: PrivilegeLevel.Admin,
      rows: withoutContact(ADMIN_ROWS),
    });
    expect(
      within(table()).queryByRole("columnheader", { name: "Contact" }),
    ).not.toBeInTheDocument();
  });
});

// --- Row actions -----------------------------------------------------------------

describe("RosterTab row actions", () => {
  it("offers an Admin add on a vacant seat as a visible button, and details, resignation and removal on members (no replace)", async () => {
    renderRoster({ role: PrivilegeLevel.Admin });

    expect(trigger("Add member for seat 2")).toHaveTextContent("Add member");
    // In the vacant row's empty Contact cell, not in the pinned Actions
    // column, which stays icon-wide on narrow screens.
    const cells = within(rowWith("— vacant —")).getAllByRole("cell");
    expect(cells.map((c) => c.textContent)).toEqual([
      "2",
      "— vacant —",
      "Add member",
      "",
    ]);
    expect(cells[2]).toContainElement(trigger("Add member for seat 2"));
    expect(
      screen.queryByRole("button", { name: "Actions for seat 2" }),
    ).not.toBeInTheDocument();
    expect(await menuItemsFor("Actions for seat 1")).toEqual([
      "View voter details",
      "Record resignation",
      "Remove member",
    ]);
    await userEvent.keyboard("{Escape}");
    expect(await menuItemsFor("Actions for Sam Loose")).toEqual([
      "View voter details",
      "Record resignation",
      "Remove member",
    ]);
  });

  it("dispatches Admin actions as plan §8 action objects", async () => {
    const onAction = jest.fn();
    renderRoster({ role: PrivilegeLevel.Admin, onAction });

    await userEvent.click(trigger("Add member for seat 3"));
    await menuItemsFor("Actions for seat 1");
    await userEvent.click(
      screen.getByRole("menuitem", { name: "Record resignation" }),
    );
    await menuItemsFor("Actions for Sam Loose");
    await userEvent.click(
      screen.getByRole("menuitem", { name: "Remove member" }),
    );
    await menuItemsFor("Actions for seat 1");
    await userEvent.click(
      screen.getByRole("menuitem", { name: "View voter details" }),
    );

    expect(onAction.mock.calls).toEqual([
      [{ kind: "add-member", committee: REF, seatNumber: 3 }, trigger("Add member for seat 3")],
      [{ kind: "record-resignation", committee: REF, memberId: "V1" }, trigger("Actions for seat 1")],
      [{ kind: "remove-member", committee: REF, memberId: "V9" }, trigger("Actions for Sam Loose")],
      [{ kind: "view-voter-details", committee: REF, memberId: "V1" }, trigger("Actions for seat 1")],
    ]);
    // Dispatch only: nothing opens.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([PrivilegeLevel.Leader, PrivilegeLevel.RequestAccess])(
    "offers %s submit on a vacant seat as a visible button and details and replace on members, never resignation or removal",
    async (role) => {
      const onAction = jest.fn();
      renderRoster({ role, onAction });

      expect(trigger("Submit candidate for seat 2")).toHaveTextContent(
        "Submit candidate",
      );
      await userEvent.click(trigger("Submit candidate for seat 2"));
      expect(await menuItemsFor("Actions for seat 1")).toEqual([
        "View voter details",
        "Replace member",
      ]);
      await userEvent.click(
        screen.getByRole("menuitem", { name: "Replace member" }),
      );

      expect(onAction.mock.calls).toEqual([
        [{ kind: "add-member", committee: REF, seatNumber: 2 }, trigger("Submit candidate for seat 2")],
        [{ kind: "replace-member", committee: REF, memberId: "V1" }, trigger("Actions for seat 1")],
      ]);
    },
  );

  it("gives a Developer the Admin actions", async () => {
    renderRoster({ role: PrivilegeLevel.Developer });
    expect(await menuItemsFor("Actions for seat 1")).toEqual([
      "View voter details",
      "Record resignation",
      "Remove member",
    ]);
  });

  it("shows ReadAccess no action menus and no actions column", () => {
    renderRoster({ role: PrivilegeLevel.ReadAccess });
    expect(within(table()).queryAllByRole("button")).toHaveLength(0);
    expect(
      within(table()).queryByRole("columnheader", { name: "Actions" }),
    ).not.toBeInTheDocument();
  });

  it("is a no-op when the workspace passes no handler (until the drawer lands)", async () => {
    renderRoster({ role: PrivilegeLevel.Admin });
    await menuItemsFor("Actions for seat 1");
    await userEvent.click(
      screen.getByRole("menuitem", { name: "Remove member" }),
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
