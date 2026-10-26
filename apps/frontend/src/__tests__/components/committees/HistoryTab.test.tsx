/**
 * History tab (ticket 12, plan §7.4): the **Committee history** timeline and
 * the Admin-only **Election outcomes** section, gated by `actingPermissions`
 * on top of the server's own omission (skills/auth-check-patterns).
 */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import { PrivilegeLevel } from "@prisma/client";

import { HistoryTab } from "~/app/committees/workspace/tabs/HistoryTab";
import {
  electionOutcomeCounts,
  electionOutcomeRows,
} from "~/app/committees/workspace/tabs/history/historyModel";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import type * as UtilsModule from "~/lib/utils";
import {
  committeeDetailResponseSchema,
  type CommitteeDetailResponse,
  type HistoryEvent,
  type PetitionOutcomeContext,
} from "~/lib/validations/committee";

jest.mock("~/components/providers/GlobalContext", () => {
  const { createContext } = jest.requireActual<typeof React>("react");
  return {
    GlobalContext: createContext({
      actingPermissions: "ReadAccess",
      setActingPermissions: () => undefined,
    }),
  };
});

// jest.setup stubs hasPermissionFor; the gate under test needs the real one.
beforeEach(() => {
  jest
    .mocked(hasPermissionFor)
    .mockImplementation(
      jest.requireActual<typeof UtilsModule>("~/lib/utils").hasPermissionFor,
    );
});

// --- Fixtures ------------------------------------------------------------------

const NOON = (day: string) => `${day}T12:00:00.000Z`;

/** What the endpoint sends an Admin (or a Developer, whatever role they act as). */
const ADMIN_EVENTS: HistoryEvent[] = [
  {
    id: "e-removed",
    at: NOON("2026-05-10"),
    kind: "removed",
    source: "manual",
    actor: { role: PrivilegeLevel.Admin, name: "Staffer Sam" },
    member: { name: "Rita Removed", seatNumber: 3, voterRecordId: "V-RITA" },
    reason: "MOVED_OUT_OF_DISTRICT",
    notes: "Moved to Buffalo",
  },
  {
    id: "e-resigned",
    at: NOON("2026-04-02"),
    kind: "resigned",
    source: "manual",
    actor: { role: PrivilegeLevel.Admin, name: "Staffer Sam" },
    member: { name: "Rob Resigner", seatNumber: 2 },
    effectiveDate: "2026-03-30T00:00:00.000Z",
    method: "EMAIL",
    reason: "OTHER",
    notes: "Personal reasons",
  },
  {
    id: "e-confirmed",
    at: NOON("2026-03-01"),
    kind: "confirmed",
    source: "meeting",
    actor: { role: PrivilegeLevel.Admin, name: "Staffer Sam" },
    member: { name: "Cara Confirmed", seatNumber: 4 },
    membershipType: "APPOINTED",
    meeting: {
      id: "m1",
      meetingDate: "2026-02-28T00:00:00.000Z",
      meetingType: "EXECUTIVE_COMMITTEE",
      notes: "Quorum present",
    },
  },
  {
    id: "e-submitted",
    at: NOON("2026-02-01"),
    kind: "submitted",
    source: "manual",
    actor: { role: PrivilegeLevel.Leader, name: "Leader Lee" },
    member: { name: "Cara Confirmed", seatNumber: null },
    requestNotes: "Strong volunteer",
  },
  {
    id: "e-added",
    at: NOON("2026-01-20"),
    kind: "activated",
    source: "manual",
    actor: { role: PrivilegeLevel.Admin, name: "Staffer Sam" },
    member: { name: "Andy Added", seatNumber: 1 },
    membershipType: "APPOINTED",
  },
  {
    id: "e-petition",
    at: NOON("2026-01-05"),
    kind: "petition_outcome",
    source: "petition_outcome",
    actor: { role: PrivilegeLevel.Admin, name: "Staffer Sam" },
    member: { name: "Pat Pender", seatNumber: 2 },
    outcome: "won",
    seatNumber: 2,
    primaryDate: "2025-06-24T00:00:00.000Z",
    voteCount: 41,
  },
];

const PETITION_CONTEXT: PetitionOutcomeContext[] = [
  {
    id: "pc-lost",
    voterRecordId: "V-LOU",
    voter: { VRCNUM: "V-LOU", firstName: "Lou", lastName: "Loser" },
    seatNumber: null,
    petitionSeatNumber: 2,
    status: "PETITIONED_LOST",
    petitionPrimaryDate: "2025-06-24T00:00:00.000Z",
    petitionVoteCount: 12,
  },
  {
    id: "pc-won",
    voterRecordId: "V-PAT",
    voter: { VRCNUM: "V-PAT", firstName: "Pat", lastName: "Pender" },
    seatNumber: 2,
    petitionSeatNumber: 2,
    status: "ACTIVE",
    petitionPrimaryDate: "2025-06-24T00:00:00.000Z",
    petitionVoteCount: 41,
  },
  {
    id: "pc-left",
    voterRecordId: "V-RON",
    voter: { VRCNUM: "V-RON", firstName: "Ron", lastName: "Resigned" },
    seatNumber: null,
    petitionSeatNumber: 1,
    status: "RESIGNED",
    petitionPrimaryDate: "2025-06-24T00:00:00.000Z",
    petitionVoteCount: 30,
  },
];

/**
 * What the endpoint sends a Leader: no petitionContext key, no petition
 * events, the petition win as a plain `activated` with source "other", and no
 * Admin-only keys (LPV-01, ticket 06).
 */
const LEADER_EVENTS: HistoryEvent[] = [
  {
    id: "e-removed",
    at: NOON("2026-05-10"),
    kind: "removed",
    source: "manual",
    actor: { role: PrivilegeLevel.Admin },
    member: { name: "Rita Removed", seatNumber: 3 },
  },
  {
    id: "e-petition-win",
    at: NOON("2026-01-05"),
    kind: "activated",
    source: "other",
    actor: { role: PrivilegeLevel.Admin },
    member: { name: "Pat Pender", seatNumber: 2 },
  },
];

function detail(
  overrides: Partial<CommitteeDetailResponse> = {},
): CommitteeDetailResponse {
  return {
    committee: {
      committeeListId: 7,
      cityTown: "Rochester",
      legDistrict: 2,
      electionDistrict: 29,
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
    rollup: {
      committeeListId: 7,
      cityTown: "Rochester",
      legDistrict: 2,
      electionDistrict: 29,
      totalSeats: 4,
      filled: 2,
      unassignedCount: 0,
      pendingCount: 0,
      designationWeight: null,
      missingWeightSeatNumbers: [],
    },
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

const ADMIN_DETAIL = detail({
  petitionContext: PETITION_CONTEXT,
  history: { events: ADMIN_EVENTS, hasMore: false },
});
const LEADER_DETAIL = detail({
  history: { events: LEADER_EVENTS, hasMore: false },
});

function renderTab(role: PrivilegeLevel, body: CommitteeDetailResponse) {
  return render(
    <GlobalContext.Provider
      value={{ actingPermissions: role, setActingPermissions: () => undefined }}
    >
      <HistoryTab
        committeeId={body.committee.committeeListId}
        detail={body}
        onRefresh={() => undefined}
      />
    </GlobalContext.Provider>,
  );
}

function timelineItems() {
  return within(
    screen.getByRole("list", { name: "Committee history, newest first" }),
  )
    .getAllByRole("listitem")
    .filter((li) => li.parentElement?.tagName === "OL");
}

// --- Tests ---------------------------------------------------------------------

describe("HistoryTab", () => {
  it("fixtures are valid detail responses", () => {
    expect(committeeDetailResponseSchema.safeParse(ADMIN_DETAIL).success).toBe(true);
    expect(committeeDetailResponseSchema.safeParse(LEADER_DETAIL).success).toBe(true);
  });

  describe("Admin", () => {
    it("shows Election outcomes before Committee history, both as h3", () => {
      renderTab(PrivilegeLevel.Admin, ADMIN_DETAIL);
      const headings = screen.getAllByRole("heading", { level: 3 });
      expect(headings.map((h) => h.textContent)).toEqual([
        "Election outcomes",
        "Committee history",
      ]);
      expect(screen.queryByText(/petition outcome context/i)).toBeNull();
    });

    it("lists every candidate by seat with result, votes and primary date", () => {
      renderTab(PrivilegeLevel.Admin, ADMIN_DETAIL);
      const section = screen
        .getByRole("heading", { name: "Election outcomes" })
        .closest("section")!;
      expect(within(section).getByText("1 won · 1 lost · 0 tied")).toBeInTheDocument();
      const rows = within(section).getAllByRole("row").slice(1);
      expect(rows.map((r) => r.textContent)).toEqual([
        "1Ron ResignedNow resigned30Jun 24, 2025",
        "2Lou LoserLost12Jun 24, 2025",
        "2Pat PenderWon41Jun 24, 2025",
      ]);
      expect(
        within(section).getByRole("link", { name: "Open in petition outcomes" }),
      ).toHaveAttribute(
        "href",
        "/admin/petition-outcomes?committeeListId=7&termId=term-1",
      );
    });

    it("shows a timeline newest first with actor, date, reason and meeting", () => {
      renderTab(PrivilegeLevel.Admin, ADMIN_DETAIL);
      const items = timelineItems();
      expect(items).toHaveLength(ADMIN_EVENTS.length);

      const [removed, resigned, confirmed, submitted, added, petition] = items;
      expect(removed).toHaveTextContent("May 10, 2026");
      expect(removed).toHaveTextContent("by Admin Staffer Sam");
      expect(removed).toHaveTextContent("Removed");
      expect(removed).toHaveTextContent("Rita Removed · Seat 3");
      expect(removed).toHaveTextContent("Reason: Moved out of district");
      expect(removed).toHaveTextContent("Notes: Moved to Buffalo");

      expect(resigned).toHaveTextContent("Resignation received Mar 30, 2026 by email");
      expect(resigned).toHaveTextContent("Reason: Other");
      expect(resigned).toHaveTextContent("Notes: Personal reasons");

      expect(confirmed).toHaveTextContent("Submission accepted as appointed member");
      expect(confirmed).toHaveTextContent(
        "At the Executive Committee meeting of Feb 28, 2026",
      );
      expect(confirmed).toHaveTextContent("Meeting notes: Quorum present");

      expect(submitted).toHaveTextContent("by Leader Leader Lee");
      expect(submitted).toHaveTextContent("Request note: Strong volunteer");

      // A plain Admin add has no recorded reason; nothing is invented.
      expect(added).toHaveTextContent("Added as appointed member");
      expect(added).not.toHaveTextContent(/reason|meeting/i);

      expect(petition).toHaveTextContent("Election result recorded: won seat 2");
      expect(petition).toHaveTextContent("41 votes");
      expect(petition).toHaveTextContent("Primary of Jun 24, 2025");
    });

    it("says when no election outcomes are recorded", () => {
      renderTab(PrivilegeLevel.Admin, detail({ petitionContext: [] }));
      expect(
        screen.getByText("No election outcomes recorded for this committee this term."),
      ).toBeInTheDocument();
    });

    it("labels a discrepancy-undo petition row as restored, not a fresh result", () => {
      const reversed: HistoryEvent = {
        ...(ADMIN_EVENTS[5] as Extract<HistoryEvent, { kind: "petition_outcome" }>),
        source: "discrepancy_undo",
        reversed: true,
      };
      renderTab(
        PrivilegeLevel.Admin,
        detail({ history: { events: [reversed], hasMore: false } }),
      );
      expect(
        screen.getByText(
          "Restored when a discrepancy resolution was undone, not a new result",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Leader", () => {
    it("shows only Committee history, with the petition win as a plain addition", () => {
      renderTab(PrivilegeLevel.Leader, LEADER_DETAIL);
      expect(
        screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
      ).toEqual(["Committee history"]);
      expect(screen.queryByText(/election/i)).toBeNull();
      const [removed, win] = timelineItems();
      expect(removed).toHaveTextContent("by an Admin");
      expect(removed).toHaveTextContent("Removed");
      expect(removed).not.toHaveTextContent(/reason/i);
      expect(win).toHaveTextContent("Added");
      expect(win).toHaveTextContent("Pat Pender · Seat 2");
      expect(win).not.toHaveTextContent(/petition|vote|primary|election/i);
    });

    it("hides Admin data even if it reaches the client (defence in depth)", () => {
      // The server would never send this to a real Leader; the UI gate must
      // still hold on its own.
      renderTab(PrivilegeLevel.Leader, ADMIN_DETAIL);
      expectAdminDataHidden();
    });
  });

  describe("Developer acting as another role", () => {
    it("acting as Leader: the server sent Developer data, the UI shows the Leader view", () => {
      // The endpoint authorizes on the real session (Developer) and sends the
      // Admin body; only actingPermissions says Leader.
      renderTab(PrivilegeLevel.Leader, ADMIN_DETAIL);
      expectAdminDataHidden();
    });

    it("acting as RequestAccess also hides Election outcomes", () => {
      renderTab(PrivilegeLevel.RequestAccess, ADMIN_DETAIL);
      expectAdminDataHidden();
    });

    it("acting as Developer sees the Admin view", () => {
      renderTab(PrivilegeLevel.Developer, ADMIN_DETAIL);
      expect(
        screen.getByRole("heading", { name: "Election outcomes" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Election result recorded: won seat 2")).toBeInTheDocument();
    });
  });

  it("shows an empty state when nothing is recorded", () => {
    renderTab(PrivilegeLevel.Leader, detail());
    expect(
      screen.getByText("No committee history recorded for this term yet."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/most recent events only/)).toBeNull();
  });

  it("notes when older events were cut off", () => {
    renderTab(
      PrivilegeLevel.Leader,
      detail({ history: { events: LEADER_EVENTS, hasMore: true } }),
    );
    expect(
      screen.getByText(/Showing the most recent events only/),
    ).toBeInTheDocument();
  });

  it("names system-originated removals by their source", () => {
    const events: HistoryEvent[] = [
      { ...LEADER_EVENTS[0]!, id: "a", source: "bulk_import_sync" } as HistoryEvent,
      { ...LEADER_EVENTS[0]!, id: "b", source: "boe_flagging" } as HistoryEvent,
    ];
    renderTab(PrivilegeLevel.Leader, detail({ history: { events, hasMore: false } }));
    expect(screen.getByText("Removed by a committee file import")).toBeInTheDocument();
    expect(
      screen.getByText("Removed after an eligibility flag review"),
    ).toBeInTheDocument();
  });
});

function expectAdminDataHidden() {
  expect(
    screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
  ).toEqual(["Committee history"]);
  expect(screen.queryByText(/election/i)).toBeNull();
  expect(screen.queryByText(/41 votes|Primary of/)).toBeNull();
  // Staff names, notes and reasons are Admin detail.
  expect(screen.queryByText(/Staffer Sam|Leader Lee/)).toBeNull();
  expect(screen.queryByText(/Moved to Buffalo|Personal reasons|Strong volunteer|Quorum present/)).toBeNull();
  expect(screen.queryByText(/^Reason:/)).toBeNull();
  // The petition event is dropped from the timeline; the five others remain.
  expect(timelineItems()).toHaveLength(ADMIN_EVENTS.length - 1);
}

describe("electionOutcomeRows", () => {
  it("falls back to the voter id and counts only real results", () => {
    const rows = electionOutcomeRows([
      { ...PETITION_CONTEXT[0]!, voter: null },
      PETITION_CONTEXT[1]!,
      { ...PETITION_CONTEXT[2]!, status: "PETITIONED_TIE" },
    ]);
    expect(rows.map((r) => [r.candidate, r.outcome])).toEqual([
      ["Ron Resigned", "Tie"],
      ["Pat Pender", "Won"],
      ["V-LOU", "Lost"],
    ]);
    expect(electionOutcomeCounts(rows)).toEqual({ won: 1, lost: 1, tie: 1 });
  });
});
