/**
 * RecordsList shows the committee badge (ticket 08) only for acting roles of
 * Leader and up: a Developer acting as ReadAccess still receives
 * `activeCommittee` from the API (real role) but sees what ReadAccess would.
 */
import React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { PrivilegeLevel } from "@prisma/client";
import { RecordsList } from "~/app/recordsearch/RecordsList";
import { GlobalContext } from "~/components/providers/GlobalContext";
import type { RecordSearchResult } from "~/lib/validations/recordSearch";
import {
  createMockDropdownLists,
  renderWithVoterSearchProvider,
} from "../../utils/searchTestUtils";
import { createMockVoterRecord } from "../../utils/testUtils";
import {
  fetchJsonResponse,
  installFetchMock,
  mockRealPermissionHierarchy,
} from "../../utils/mocks";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
// next-auth/react is ESM-only and not transformed under jest.
jest.mock("next-auth/react", () => ({
  useSession: () => ({ status: "authenticated", data: null }),
}));
// The search form isn't under test: a button that submits an empty search.
jest.mock("~/app/recordsearch/VoterRecordSearch", () => ({
  __esModule: true,
  default: function VoterRecordSearchStub({
    handleSubmit,
  }: {
    handleSubmit: (rows: []) => Promise<void>;
  }) {
    return (
      <button type="button" onClick={() => void handleSubmit([])}>
        Search
      </button>
    );
  },
}));

const MEMBER: RecordSearchResult = {
  ...createMockVoterRecord({
    VRCNUM: "A1",
    firstName: "ALEX",
    lastName: "SAMPLE",
  }),
  activeCommittee: {
    committeeListId: 7,
    cityTown: "GREECE",
    legDistrict: 1,
    electionDistrict: 5,
  },
};
const SPOKEN =
  "Committee member: GREECE, Legislative District 1, Election District 5";

async function searchActingAs(actingPermissions: PrivilegeLevel) {
  installFetchMock(async () =>
    fetchJsonResponse({ data: [MEMBER], totalRecords: 1 }),
  );
  renderWithVoterSearchProvider(
    <GlobalContext.Provider
      value={{ actingPermissions, setActingPermissions: jest.fn() }}
    >
      <RecordsList dropdownList={createMockDropdownLists()} />
    </GlobalContext.Provider>,
  );
  await userEvent.setup().click(screen.getByRole("button", { name: "Search" }));
  // Phone cards and the table both render in jsdom (CSS breakpoints don't apply).
  expect((await screen.findAllByText("ALEX SAMPLE")).length).toBeGreaterThan(0);
}

beforeEach(() => {
  mockRealPermissionHierarchy();
  window.localStorage.clear();
});

describe("RecordsList committee badge", () => {
  it("hides the badge when acting as ReadAccess, even though the API sent it", async () => {
    await searchActingAs(PrivilegeLevel.ReadAccess);
    expect(screen.queryByText(SPOKEN)).not.toBeInTheDocument();
    expect(screen.queryByText("Committee:")).not.toBeInTheDocument();
  });

  it("shows the badge when acting as Leader", async () => {
    await searchActingAs(PrivilegeLevel.Leader);
    expect(screen.getAllByText(SPOKEN)).toHaveLength(2);
  });
});
