import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PrivilegeLevel } from "@prisma/client";
import { CommitteeRosterReportForm } from "~/app/committee-roster-reports/CommitteeRosterReportForm";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";

jest.mock("~/components/providers/GlobalContext", () => {
  const React = require("react");
  return {
    GlobalContext: React.createContext({
      actingPermissions: "ReadAccess",
      setActingPermissions: () => undefined,
    }),
  };
});

const mutateMock = jest.fn().mockResolvedValue(undefined);

jest.mock("~/hooks/useApiMutation", () => ({
  useApiMutation: () => ({
    mutate: mutateMock,
    loading: false,
  }),
}));

jest.mock("~/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock("~/app/components/ReportStatusTracker", () => ({
  ReportStatusTracker: () => null,
}));

jest.mock("~/components/ui/ComboBox", () => ({
  ComboboxDropdown: ({
    items,
    initialValue,
    onSelect,
  }: {
    items: Array<{ label: string; value: string }>;
    initialValue: string;
    onSelect: (value: string) => void;
  }) => (
    <select
      data-testid="combobox-dropdown"
      defaultValue={initialValue}
      onChange={(event) => onSelect(event.target.value)}
    >
      <option value="">Select</option>
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  ),
}));

const committeeLists = [
  {
    id: 1,
    cityTown: "ROCHESTER",
    legDistrict: 1,
    electionDistrict: 1,
    termId: "term-1",
    ltedWeight: null,
  },
  {
    id: 2,
    cityTown: "BRIGHTON",
    legDistrict: 0,
    electionDistrict: 2,
    termId: "term-1",
    ltedWeight: null,
  },
];

function renderWithPermissions(actingPermissions: PrivilegeLevel) {
  return render(
    <GlobalContext.Provider
      value={{
        actingPermissions,
        setActingPermissions: jest.fn(),
      }}
    >
      <CommitteeRosterReportForm
        committeeLists={committeeLists}
        userPrivilegeLevel={actingPermissions}
      />
    </GlobalContext.Provider>,
  );
}

describe("CommitteeRosterReportForm", () => {
  beforeEach(() => {
    mutateMock.mockClear();
    jest.mocked(hasPermissionFor).mockImplementation((user, required) => {
      const order = [
        PrivilegeLevel.Developer,
        PrivilegeLevel.Admin,
        PrivilegeLevel.Leader,
        PrivilegeLevel.RequestAccess,
        PrivilegeLevel.ReadAccess,
      ];
      return order.indexOf(user) <= order.indexOf(required);
    });
  });

  it("leader flow is jurisdiction-scoped and does not expose countywide", () => {
    renderWithPermissions(PrivilegeLevel.Leader);

    expect(screen.queryByText("Countywide")).not.toBeInTheDocument();
    expect(screen.getByText("City/Town")).toBeInTheDocument();
  });

  it("leader can submit jurisdiction roster report", async () => {
    renderWithPermissions(PrivilegeLevel.Leader);

    fireEvent.change(screen.getByTestId("combobox-dropdown"), {
      target: { value: "ROCHESTER" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Generate Report" }),
    );

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "committeeRoster",
          scope: "jurisdiction",
          cityTown: "ROCHESTER",
          includeFields: [],
        }),
      );
    });
  });

  it("admin can submit countywide roster report", async () => {
    renderWithPermissions(PrivilegeLevel.Admin);

    expect(screen.getByText("Countywide")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Generate Report" }),
    );

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "committeeRoster",
          scope: "countywide",
          includeFields: [],
        }),
      );
    });
  });
});
