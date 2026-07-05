import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel } from "@prisma/client";
import {
  SCOPE_REPORT_REGISTRY,
  SCOPE_REPORT_TYPES,
  type ScopeReportType,
} from "@voter-file-tool/shared-validators";
import { ScopedReportForm } from "~/components/reports/ScopedReportForm";
import {
  SCOPE_REPORT_FORM_MESSAGES,
  last30DaysIsoRange,
} from "~/components/reports/scopeReportFormSpecs";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";

jest.mock("~/components/providers/GlobalContext", () => ({
  GlobalContext: React.createContext({
    actingPermissions: "ReadAccess",
    setActingPermissions: () => undefined,
  }),
}));

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

function getDefaultFormat(type: ScopeReportType): "pdf" | "xlsx" {
  const formatDef = SCOPE_REPORT_REGISTRY[type].format;
  return formatDef.kind === "fixed" ? formatDef.value : formatDef.default;
}

function leaderPayload(type: ScopeReportType): Record<string, unknown> {
  const base = {
    type,
    scope: "jurisdiction",
    cityTown: "ROCHESTER",
    format: getDefaultFormat(type),
  };

  switch (type) {
    case "committeeRoster":
      return { ...base, includeFields: [] };
    case "vacancyReport":
      return { ...base, vacancyFilter: "vacantOnly" };
    case "changesReport": {
      const { from, to } = last30DaysIsoRange();
      return { ...base, dateFrom: from, dateTo: to };
    }
    default:
      return base;
  }
}

function adminCountywidePayload(type: ScopeReportType): Record<string, unknown> {
  const base = {
    type,
    scope: "countywide",
    format: getDefaultFormat(type),
  };

  switch (type) {
    case "committeeRoster":
      return { ...base, includeFields: [] };
    case "vacancyReport":
      return { ...base, vacancyFilter: "vacantOnly" };
    case "changesReport": {
      const { from, to } = last30DaysIsoRange();
      return { ...base, dateFrom: from, dateTo: to };
    }
    default:
      return base;
  }
}

function renderWithPermissions(
  actingPermissions: PrivilegeLevel,
  type: ScopeReportType,
) {
  return render(
    <GlobalContext.Provider
      value={{
        actingPermissions,
        setActingPermissions: jest.fn(),
      }}
    >
      <ScopedReportForm
        type={type}
        committeeLists={committeeLists}
        userPrivilegeLevel={actingPermissions}
      />
    </GlobalContext.Provider>,
  );
}

describe.each(SCOPE_REPORT_TYPES)("ScopedReportForm (%s)", (type) => {
  const submitLabel = SCOPE_REPORT_FORM_MESSAGES[type].submitLabel;

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
    renderWithPermissions(PrivilegeLevel.Leader, type);

    expect(screen.queryByText("Countywide")).not.toBeInTheDocument();
    expect(screen.getByText("City/Town")).toBeInTheDocument();
  });

  it("leader can submit jurisdiction-scoped report", async () => {
    renderWithPermissions(PrivilegeLevel.Leader, type);

    fireEvent.change(screen.getByTestId("combobox-dropdown"), {
      target: { value: "ROCHESTER" },
    });
    fireEvent.click(screen.getByRole("button", { name: submitLabel }));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining(leaderPayload(type)),
      );
    });
  });

  it("admin can submit countywide report", async () => {
    renderWithPermissions(PrivilegeLevel.Admin, type);

    expect(screen.getByText("Countywide")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: submitLabel }));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining(adminCountywidePayload(type)),
      );
    });
  });

  it("requires cityTown when admin selects jurisdiction scope", async () => {
    const user = userEvent.setup();
    renderWithPermissions(PrivilegeLevel.Admin, type);

    await user.click(screen.getByText("By Jurisdiction"));
    await user.click(screen.getByRole("button", { name: submitLabel }));

    expect(
      screen.getByText("City/Town selection is required for jurisdiction scope"),
    ).toBeInTheDocument();
    expect(mutateMock).not.toHaveBeenCalled();
  });
});

describe("ScopedReportForm type-specific fields", () => {
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

  it("vacancyReport sends vacancyFilter=all when selected", async () => {
    renderWithPermissions(PrivilegeLevel.Admin, "vacancyReport");

    fireEvent.click(screen.getByText("Show all"));
    fireEvent.click(screen.getByRole("button", { name: "Generate Report" }));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "vacancyReport",
          scope: "countywide",
          vacancyFilter: "all",
        }),
      );
    });
  });

  it("changesReport requires date range before submit", async () => {
    const user = userEvent.setup();
    renderWithPermissions(PrivilegeLevel.Admin, "changesReport");

    await user.clear(screen.getByLabelText("Start Date"));
    await user.clear(screen.getByLabelText("End Date"));
    await user.click(screen.getByRole("button", { name: "Generate Report" }));

    expect(screen.getByText("Start date is required")).toBeInTheDocument();
    expect(screen.getByText("End date is required")).toBeInTheDocument();
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("signInSheet shows optional meeting date field", () => {
    renderWithPermissions(PrivilegeLevel.Admin, "signInSheet");

    expect(
      screen.getByLabelText("Meeting Date (optional)"),
    ).toBeInTheDocument();
  });

  it("designationWeightSummary shows format selector defaulting to xlsx", () => {
    renderWithPermissions(PrivilegeLevel.Admin, "designationWeightSummary");

    expect(screen.getByLabelText("Format")).toHaveValue("xlsx");
    expect(screen.getByLabelText("Report Name")).toHaveDisplayValue(
      /Weight Summary/,
    );
  });

  it("petitionOutcomesReport shows format selector defaulting to xlsx", () => {
    renderWithPermissions(PrivilegeLevel.Admin, "petitionOutcomesReport");

    expect(screen.getByLabelText("Format")).toHaveValue("xlsx");
    expect(screen.getByLabelText("Report Name")).toHaveDisplayValue(
      /Petition Outcomes/,
    );
  });
});
