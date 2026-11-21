/**
 * RecordsList records `record_search_performed` (field names and counts, never
 * values) and `voter_details_opened` for PostHog.
 */
import React from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { PrivilegeLevel } from "@prisma/client";
import { RecordsList } from "~/app/recordsearch/RecordsList";
import { GlobalContext } from "~/components/providers/GlobalContext";
import {
  createMockDropdownLists,
  renderWithVoterSearchProvider,
} from "../../utils/searchTestUtils";
import { createMockVoterRecord } from "../../utils/testUtils";
import {
  fetchJsonResponse,
  installFetchMock,
  mockRealPermissionHierarchy,
  type FetchMockImpl,
} from "../../utils/mocks";

const mockCapture = jest.fn<void, unknown[]>();
jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: (...args: unknown[]) => mockCapture(...args) },
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { privilegeLevel: "Admin" } },
  }),
}));
// The search form isn't under test: a button that submits a street search.
jest.mock("~/app/recordsearch/VoterRecordSearch", () => ({
  __esModule: true,
  default: function VoterRecordSearchStub({
    handleSubmit,
  }: {
    handleSubmit: (rows: unknown[]) => Promise<void>;
  }) {
    return (
      <button
        type="button"
        onClick={() =>
          void handleSubmit([
            {
              name: "street",
              displayName: "Street",
              type: "Street",
              value: "MAIN ST",
              compoundType: false,
            },
            {
              name: "lastName",
              displayName: "Last Name",
              type: "String",
              value: "SAMPLE",
              compoundType: false,
            },
          ])
        }
      >
        Search
      </button>
    );
  },
}));

const captured = (event: string) =>
  mockCapture.mock.calls
    .filter(([name]) => name === event)
    .map(([, props]) => props);

async function search(response: FetchMockImpl) {
  installFetchMock(response);
  renderWithVoterSearchProvider(
    <GlobalContext.Provider
      value={{
        actingPermissions: PrivilegeLevel.Admin,
        setActingPermissions: jest.fn(),
      }}
    >
      <RecordsList dropdownList={createMockDropdownLists()} />
    </GlobalContext.Provider>,
  );
  await userEvent.setup().click(screen.getByRole("button", { name: "Search" }));
}

beforeEach(() => {
  mockCapture.mockClear();
  mockRealPermissionHierarchy();
  window.localStorage.clear();
});

describe("RecordsList analytics", () => {
  it("records the search with field names and the result count, not values", async () => {
    await search(async () =>
      fetchJsonResponse({
        data: [createMockVoterRecord({ VRCNUM: "A1", lastName: "SAMPLE" })],
        totalRecords: 1,
      }),
    );
    await screen.findAllByText(/SAMPLE/);

    const [props] = captured("record_search_performed");
    expect(props).toEqual({
      mode: "simple",
      criteria_fields: ["lastName", "street"],
      result_count: 1,
      duration_ms: expect.any(Number) as unknown,
      outcome: "success",
    });
    expect(JSON.stringify(props)).not.toMatch(/MAIN ST|SAMPLE/);
  });

  it("records opening a voter's details", async () => {
    await search(async () =>
      fetchJsonResponse({
        data: [createMockVoterRecord({ VRCNUM: "A1" })],
        totalRecords: 1,
      }),
    );
    const [details] = await screen.findAllByRole("button", {
      name: /See more details/,
    });
    await userEvent.setup().click(details!);

    expect(captured("voter_details_opened")).toEqual([{ from: "" }]);
  });
});
