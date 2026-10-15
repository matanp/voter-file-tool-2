/**
 * Seats & Weight tab (ticket 11, plan §7.3): seat summary, designation weight
 * with missing-weight warnings, and for acting Admins the LTED total-weight
 * editor (`PATCH /api/committee/updateLtedWeight`) and the per-seat
 * breakdown. Leaders see what they see today: the summary only.
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel } from "@prisma/client";

import { SeatsWeightTab } from "~/app/committees/workspace/tabs/SeatsWeightTab";
import { parseLtedWeightInput } from "~/app/committees/workspace/tabs/seats/seatsWeightDisplay";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import type * as UtilsModule from "~/lib/utils";
import type { CommitteeDetailResponse } from "~/lib/validations/committee";

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

type DetailOverrides = {
  ltedWeight?: string | null;
  designationWeight?: number | null;
  missingWeightSeatNumbers?: number[];
  unassignedCount?: number;
};

/**
 * Seat 1 petitioned + occupied (contributes 25), seat 2 petitioned + vacant,
 * seat 3 appointed-only, seat 4 petitioned + occupied with no weight.
 */
function detailWith(overrides: DetailOverrides = {}): CommitteeDetailResponse {
  const missing = overrides.missingWeightSeatNumbers ?? [4];
  const rollup = {
    committeeListId: 2,
    cityTown: "GREECE",
    legDistrict: 1,
    electionDistrict: 2,
    filled: 3,
    totalSeats: 4,
    unassignedCount: overrides.unassignedCount ?? 1,
    pendingCount: 0,
    designationWeight:
      overrides.designationWeight === undefined ? 25 : overrides.designationWeight,
    missingWeightSeatNumbers: missing,
  };
  return {
    committee: {
      committeeListId: 2,
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 2,
      termId: "term-1",
      ltedWeight: overrides.ltedWeight === undefined ? "100" : overrides.ltedWeight,
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
      totalWeight: rollup.designationWeight ?? 0,
      totalContributingSeats: 1,
      seats: [
        {
          seatNumber: 1,
          isPetitioned: true,
          isOccupied: true,
          occupantMembershipType: "PETITIONED",
          seatWeight: 25,
          contributes: true,
          contributionWeight: 25,
        },
        {
          seatNumber: 2,
          isPetitioned: true,
          isOccupied: false,
          occupantMembershipType: null,
          seatWeight: 25,
          contributes: false,
          contributionWeight: 0,
        },
        {
          seatNumber: 3,
          isPetitioned: false,
          isOccupied: true,
          occupantMembershipType: "APPOINTED",
          seatWeight: 25,
          contributes: false,
          contributionWeight: 0,
        },
        {
          seatNumber: 4,
          isPetitioned: true,
          isOccupied: true,
          occupantMembershipType: "APPOINTED",
          seatWeight: null,
          contributes: false,
          contributionWeight: 0,
        },
      ],
      missingWeightSeatNumbers: missing,
    },
    pending: [],
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

function renderTab(
  detail: CommitteeDetailResponse,
  actingPermissions: PrivilegeLevel = PrivilegeLevel.Admin,
) {
  const onRefresh = jest.fn();
  const ui = (d: CommitteeDetailResponse) => (
    <GlobalContext.Provider
      value={{ actingPermissions, setActingPermissions: () => undefined }}
    >
      <SeatsWeightTab committeeId={2} detail={d} onRefresh={onRefresh} />
    </GlobalContext.Provider>
  );
  const result = render(ui(detail));
  return {
    onRefresh,
    rerenderWith: (d: CommitteeDetailResponse) => result.rerender(ui(d)),
  };
}

const weightInput = () => screen.getByRole("textbox", { name: "LTED total weight" });
const saveButton = () => screen.getByRole("button", { name: /Save LTED weight|Saving/ });
const summary = () => screen.getByRole("list", { name: "Seat and weight summary" });

let fetchMock: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(hasPermissionFor)
    .mockImplementation(
      jest.requireActual<typeof UtilsModule>("~/lib/utils").hasPermissionFor,
    );
  fetchMock = jest.fn(async () => jsonResponse({ success: true }));
  global.fetch = fetchMock as unknown as typeof fetch;
});

const patchCalls = (): Array<[string, RequestInit]> =>
  (fetchMock.mock.calls as Array<[string, RequestInit]>).filter(([input]) =>
    input.startsWith("/api/committee/updateLtedWeight"),
  );

// --- Tests ---------------------------------------------------------------------

describe("SeatsWeightTab summary", () => {
  it("summarizes occupancy and weight in text, with the missing-weight warning spelled out", () => {
    renderTab(detailWith());
    expect(screen.getByRole("heading", { level: 3, name: "Seats & Weight" })).toBeInTheDocument();
    const items = within(summary()).getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.stringContaining("3 of 4 seats filled"),
        expect.stringContaining("1 open"),
        expect.stringContaining("1 unassigned member"),
        expect.stringContaining("Designation weight —"),
      ]),
    );
    expect(screen.getByText(/Weight incomplete: petitioned seat 4 has no weight/)).toBeInTheDocument();
  });

  it("shows the designation weight once every petitioned seat has a weight", () => {
    renderTab(detailWith({ missingWeightSeatNumbers: [], unassignedCount: 0 }));
    expect(summary()).toHaveTextContent("Designation weight 25.00");
    expect(screen.queryByText(/Weight incomplete/)).not.toBeInTheDocument();
    expect(within(summary()).queryByText(/unassigned/)).not.toBeInTheDocument();
  });
});

describe("SeatsWeightTab for Admins", () => {
  it("lists every seat's petitioned, occupied, weight and contribution", () => {
    renderTab(detailWith());
    const table = screen.getByRole("table", { name: "Designation weight by seat" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell").map((c) => c.textContent))).toEqual([
      ["1", "Yes", "Yes", "25.0000", "25.0000"],
      ["2", "Yes", "No", "25.0000", "0.0000"],
      ["3", "No", "Yes", "25.0000", "0.0000"],
      ["4", "Yes", "Yes", "Missing", "—"],
    ]);
  });

  it("saves a new LTED weight, then refreshes and announces it", async () => {
    const { onRefresh } = renderTab(detailWith());
    expect(weightInput()).toHaveValue("100");
    expect(saveButton()).toBeDisabled(); // unchanged

    await userEvent.clear(weightInput());
    await userEvent.type(weightInput(), " 120.5 ");
    await userEvent.click(saveButton());

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(patchCalls()).toHaveLength(1);
    const [, init] = patchCalls()[0]!;
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ committeeListId: 2, ltedWeight: 120.5 });
    expect(screen.getByRole("status")).toHaveTextContent("LTED weight saved.");
  });

  it("clears the LTED weight when the field is emptied", async () => {
    renderTab(detailWith());
    await userEvent.clear(weightInput());
    await userEvent.click(saveButton());
    await waitFor(() => expect(patchCalls()).toHaveLength(1));
    const [, init] = patchCalls()[0]!;
    expect(JSON.parse(String(init.body))).toEqual({ committeeListId: 2, ltedWeight: null });
    expect(await screen.findByRole("status")).toHaveTextContent("LTED weight cleared.");
  });

  it("rejects an invalid weight inline without calling the server", async () => {
    const { onRefresh } = renderTab(detailWith());
    await userEvent.clear(weightInput());
    await userEvent.type(weightInput(), "-5");
    await userEvent.click(saveButton());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "LTED weight must be a non-negative number.",
    );
    expect(weightInput()).toHaveAttribute("aria-invalid", "true");
    expect(patchCalls()).toHaveLength(0);
    expect(onRefresh).not.toHaveBeenCalled();

    // Editing again clears the error.
    await userEvent.type(weightInput(), "0");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables Save while saving and shows the server error without refreshing", async () => {
    const response = deferred<Response>();
    fetchMock.mockImplementationOnce(() => response.promise);
    const { onRefresh } = renderTab(detailWith());
    await userEvent.clear(weightInput());
    await userEvent.type(weightInput(), "80");
    await userEvent.click(saveButton());

    expect(saveButton()).toBeDisabled();
    expect(saveButton()).toHaveTextContent("Saving…");

    response.resolve(jsonResponse({ error: "Committee not found" }, 404));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save LTED weight: Committee not found",
    );
    expect(onRefresh).not.toHaveBeenCalled();
    expect(saveButton()).toBeEnabled();
    expect(weightInput()).toHaveValue("80");
  });

  it("shows the refreshed server value once the detail reloads", async () => {
    const { rerenderWith } = renderTab(detailWith());
    await userEvent.clear(weightInput());
    await userEvent.type(weightInput(), "120");
    await userEvent.click(saveButton());
    await screen.findByRole("status");

    rerenderWith(detailWith({ ltedWeight: "120" }));
    expect(weightInput()).toHaveValue("120");
    expect(saveButton()).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("LTED weight saved.");
  });
});

describe("SeatsWeightTab for Leaders", () => {
  it("shows the summary read-only, with no editor or per-seat breakdown", () => {
    // `actingPermissions` decides, so this also covers a Developer acting as a Leader.
    renderTab(detailWith(), PrivilegeLevel.Leader);
    expect(summary()).toHaveTextContent("LTED weight 100");
    expect(summary()).toHaveTextContent("Designation weight —");
    expect(screen.getByText(/Weight incomplete: petitioned seat 4 has no weight/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("parseLtedWeightInput", () => {
  it("treats blank as clearing the weight", () => {
    expect(parseLtedWeightInput("   ")).toEqual({ ok: true, value: null });
  });

  it("accepts non-negative numbers", () => {
    expect(parseLtedWeightInput("0")).toEqual({ ok: true, value: 0 });
    expect(parseLtedWeightInput(" 12.75 ")).toEqual({ ok: true, value: 12.75 });
  });

  it("rejects negatives, text and non-finite values", () => {
    for (const text of ["-1", "abc", "1,000", "Infinity", "1e999"]) {
      expect(parseLtedWeightInput(text).ok).toBe(false);
    }
  });
});
