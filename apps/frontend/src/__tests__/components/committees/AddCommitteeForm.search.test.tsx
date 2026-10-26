import React from "react";
import { PrivilegeLevel } from "@prisma/client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockJsonResponse } from "../../utils/testUtils";

jest.mock("~/components/providers/GlobalContext", () => ({
  GlobalContext: React.createContext({
    actingPermissions: PrivilegeLevel.Admin,
    setActingPermissions: () => undefined,
  }),
}));

jest.mock("~/app/recordsearch/VoterRecordTable", () => ({
  VoterRecordTable: () => null,
}));

jest.mock("~/components/ui/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
  toast: jest.fn(),
}));

import {
  AddCommitteeForm,
  ELIGIBLE_ONLY_UNAVAILABLE_MESSAGE,
} from "~/app/committees/AddCommitteeForm";

type SearchBody = { searchQuery: Array<{ field: string; values: unknown[] }> };

describe("AddCommitteeForm: Only Eligible Candidates", () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/fetchFilteredData")) {
        return Promise.resolve(mockJsonResponse({ data: [] }));
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  function renderForm(
    props: Partial<React.ComponentProps<typeof AddCommitteeForm>> = {},
  ) {
    render(
      <AddCommitteeForm
        city="GREECE"
        legDistrict="1"
        electionDistrict={5}
        committeeListId={10}
        committeeList={[]}
        assemblyDistrict="134"
        requireAssemblyDistrictMatch={true}
        onAdd={() => undefined}
        {...props}
      />,
    );
  }

  async function searchByLastName(lastName: string): Promise<SearchBody> {
    await userEvent.type(screen.getByLabelText("Last Name"), lastName);
    await userEvent.click(
      screen.getByRole("button", { name: "Find Members to Add" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    return JSON.parse(String(init.body)) as SearchBody;
  }

  it("filters by the committee's assembly district, not town, LD or ED", async () => {
    renderForm();

    expect(
      screen.getByRole("checkbox", { name: "Only Eligible Candidates" }),
    ).toBeChecked();

    const body = await searchByLastName("Doe");

    expect(body.searchQuery).toEqual([
      { field: "stateAssmblyDistrict", values: ["134"] },
      { field: "lastName", values: ["DOE"] },
    ]);
    const fields = body.searchQuery.map((q) => q.field);
    expect(fields).not.toContain("city");
    expect(fields).not.toContain("L_T");
    expect(fields).not.toContain("electionDistrict");
  });

  it("adds no residency condition when the AD check is off", async () => {
    renderForm({ requireAssemblyDistrictMatch: false, assemblyDistrict: null });

    const checkbox = screen.getByRole("checkbox", {
      name: "Only Eligible Candidates",
    });
    expect(checkbox).toBeEnabled();
    expect(
      screen.queryByText(ELIGIBLE_ONLY_UNAVAILABLE_MESSAGE),
    ).not.toBeInTheDocument();

    const body = await searchByLastName("Doe");

    expect(body.searchQuery).toEqual([{ field: "lastName", values: ["DOE"] }]);
  });

  it("disables the filter and explains why when the committee has no AD, without falling back to the ED", async () => {
    renderForm({ assemblyDistrict: null });

    const checkbox = screen.getByRole("checkbox", {
      name: "Only Eligible Candidates",
    });
    expect(checkbox).toBeDisabled();
    expect(checkbox).not.toBeChecked();
    const note = screen.getByText(ELIGIBLE_ONLY_UNAVAILABLE_MESSAGE);
    expect(checkbox).toHaveAttribute("aria-describedby", note.id);

    const body = await searchByLastName("Doe");

    expect(body.searchQuery).toEqual([{ field: "lastName", values: ["DOE"] }]);
  });
});
