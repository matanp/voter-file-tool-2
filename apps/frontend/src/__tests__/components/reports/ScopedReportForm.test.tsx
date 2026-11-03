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

type Assignment = { cityTown: string; legDistrict: number | null };

const ROCHESTER_LD_22: Assignment = { cityTown: "ROCHESTER", legDistrict: 22 };
const ROCHESTER_LD_23: Assignment = { cityTown: "ROCHESTER", legDistrict: 23 };
const BRIGHTON_TOWN_WIDE: Assignment = { cityTown: "BRIGHTON", legDistrict: null };

const ROSTER_XLSX_DEFAULT = {
  includeCompoundFields: { name: true, address: true, mailingAddress: false },
};

function leaderPayload(
  type: ScopeReportType,
  jurisdiction: { cityTown: string; legDistrict?: number },
): Record<string, unknown> {
  const base = {
    type,
    scope: "jurisdiction",
    ...jurisdiction,
    format: getDefaultFormat(type),
  };

  switch (type) {
    case "committeeRoster":
      return { ...base, includeFields: [], xlsxConfig: ROSTER_XLSX_DEFAULT };
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
      return { ...base, includeFields: [], xlsxConfig: ROSTER_XLSX_DEFAULT };
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
  {
    leaderAssignments = [],
    userPrivilegeLevel = actingPermissions,
  }: {
    leaderAssignments?: Assignment[];
    userPrivilegeLevel?: PrivilegeLevel;
  } = {},
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
        leaderAssignments={leaderAssignments}
        userPrivilegeLevel={userPrivilegeLevel}
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

  it("leader with one LD assignment submits it without choosing anything", async () => {
    renderWithPermissions(PrivilegeLevel.Leader, type, {
      leaderAssignments: [ROCHESTER_LD_22],
    });

    expect(screen.queryByText("Countywide")).not.toBeInTheDocument();
    expect(screen.queryByText("City/Town")).not.toBeInTheDocument();
    expect(screen.queryByTestId("combobox-dropdown")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Committee")).not.toBeInTheDocument();
    expect(screen.getByText("Rochester – LD 22")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: submitLabel }));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining(
          leaderPayload(type, { cityTown: "ROCHESTER", legDistrict: 22 }),
        ),
      );
    });
  });

  it("leader with several assignments picks one from a dropdown of exactly those", async () => {
    const user = userEvent.setup();
    renderWithPermissions(PrivilegeLevel.Leader, type, {
      leaderAssignments: [ROCHESTER_LD_22, ROCHESTER_LD_23],
    });

    const picker = screen.getByLabelText("Committee");
    expect(
      Array.from((picker as HTMLSelectElement).options).map((o) => o.text),
    ).toEqual(["Rochester – LD 22", "Rochester – LD 23"]);
    expect(picker).toHaveDisplayValue("Rochester – LD 22");

    await user.click(screen.getByRole("button", { name: submitLabel }));
    await waitFor(() => {
      expect(mutateMock).toHaveBeenLastCalledWith(
        expect.objectContaining(
          leaderPayload(type, { cityTown: "ROCHESTER", legDistrict: 22 }),
        ),
      );
    });

    await user.selectOptions(picker, "Rochester – LD 23");
    await user.click(screen.getByRole("button", { name: submitLabel }));
    await waitFor(() => {
      expect(mutateMock).toHaveBeenLastCalledWith(
        expect.objectContaining(
          leaderPayload(type, { cityTown: "ROCHESTER", legDistrict: 23 }),
        ),
      );
    });
  });

  it("town-wide leader sends cityTown and no legDistrict", async () => {
    renderWithPermissions(PrivilegeLevel.Leader, type, {
      leaderAssignments: [BRIGHTON_TOWN_WIDE],
    });

    expect(screen.getByText("Brighton")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: submitLabel }));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining(leaderPayload(type, { cityTown: "BRIGHTON" })),
      );
    });
    expect(mutateMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ legDistrict: expect.anything() }),
    );
  });

  it("leader with no assignments sees a message and cannot submit", () => {
    renderWithPermissions(PrivilegeLevel.Leader, type, {
      leaderAssignments: [],
    });

    expect(
      screen.getByText(/no assigned committee for the current term/),
    ).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: submitLabel });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("developer acting as leader gets the leader form, not admin controls", async () => {
    renderWithPermissions(PrivilegeLevel.Leader, type, {
      userPrivilegeLevel: PrivilegeLevel.Developer,
      leaderAssignments: [ROCHESTER_LD_22],
    });

    expect(screen.queryByText("Countywide")).not.toBeInTheDocument();
    expect(screen.queryByText("City/Town")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: submitLabel }));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining(
          leaderPayload(type, { cityTown: "ROCHESTER", legDistrict: 22 }),
        ),
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

describe("ScopedReportForm committeeRoster field picker", () => {
  const PDF_NOTE =
    "Long values may be cut off in the PDF. Choose Excel (XLSX) for complete data.";

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

  async function submitAndGetPayload(): Promise<Record<string, unknown>> {
    fireEvent.click(screen.getByRole("button", { name: "Generate Report" }));
    await waitFor(() => expect(mutateMock).toHaveBeenCalledTimes(1));
    const [payload] = mutateMock.mock.calls[0] as [Record<string, unknown>];
    return payload;
  }

  it("shows Name checked and disabled with the XLSX defaults", () => {
    renderWithPermissions(PrivilegeLevel.Admin, "committeeRoster");

    expect(screen.getByLabelText("Format")).toHaveValue("xlsx");
    const nameBox = screen.getByLabelText("Name");
    expect(nameBox).toBeChecked();
    expect(nameBox).toBeDisabled();
    expect(screen.getByLabelText("Address")).toBeChecked();
    expect(screen.getByLabelText("Mailing Address")).not.toBeChecked();
    expect(screen.getByLabelText("Phone")).not.toBeChecked();
    expect(screen.getByLabelText("Email")).not.toBeChecked();
  });

  it("sends the XLSX default selection", async () => {
    renderWithPermissions(PrivilegeLevel.Admin, "committeeRoster");

    const payload = await submitAndGetPayload();
    expect(payload).toMatchObject({
      format: "xlsx",
      includeFields: [],
      xlsxConfig: ROSTER_XLSX_DEFAULT,
    });
    expect(payload.xlsxConfig).not.toHaveProperty("columnOrder");
    expect(payload.xlsxConfig).not.toHaveProperty("columnHeaders");
  });

  it("sends the PDF default selection with Phone checked", async () => {
    const user = userEvent.setup();
    renderWithPermissions(PrivilegeLevel.Admin, "committeeRoster");

    await user.selectOptions(screen.getByLabelText("Format"), "pdf");
    expect(screen.getByLabelText("Phone")).toBeChecked();

    const payload = await submitAndGetPayload();
    expect(payload).toMatchObject({
      format: "pdf",
      includeFields: ["telephone"],
      xlsxConfig: ROSTER_XLSX_DEFAULT,
    });
  });

  it("sends every field in order when all are checked", async () => {
    const user = userEvent.setup();
    renderWithPermissions(PrivilegeLevel.Leader, "committeeRoster", {
      leaderAssignments: [ROCHESTER_LD_22],
    });

    await user.click(screen.getByLabelText("Email"));
    await user.click(screen.getByLabelText("Mailing Address"));
    await user.click(screen.getByLabelText("Phone"));

    const payload = await submitAndGetPayload();
    expect(payload).toMatchObject({
      format: "xlsx",
      includeFields: ["telephone", "email"],
      xlsxConfig: {
        includeCompoundFields: {
          name: true,
          address: true,
          mailingAddress: true,
        },
      },
    });
  });

  it("sends address: false when Address is unchecked", async () => {
    const user = userEvent.setup();
    renderWithPermissions(PrivilegeLevel.Admin, "committeeRoster");

    await user.click(screen.getByLabelText("Address"));

    const payload = await submitAndGetPayload();
    expect(payload).toMatchObject({
      xlsxConfig: {
        includeCompoundFields: {
          name: true,
          address: false,
          mailingAddress: false,
        },
      },
    });
  });

  it("resets Phone to the format's default when the format changes", async () => {
    const user = userEvent.setup();
    renderWithPermissions(PrivilegeLevel.Admin, "committeeRoster");
    const format = screen.getByLabelText("Format");
    const phone = screen.getByLabelText("Phone");

    await user.click(phone);
    expect(phone).toBeChecked();

    await user.selectOptions(format, "pdf");
    expect(phone).toBeChecked();

    await user.click(phone);
    expect(phone).not.toBeChecked();

    await user.selectOptions(format, "xlsx");
    expect(phone).not.toBeChecked();

    await user.selectOptions(format, "pdf");
    expect(phone).toBeChecked();
  });

  it("shows the PDF cut-off note only for PDF with Mailing Address or Email", async () => {
    const user = userEvent.setup();
    renderWithPermissions(PrivilegeLevel.Admin, "committeeRoster");
    const format = screen.getByLabelText("Format");

    await user.click(screen.getByLabelText("Email"));
    expect(screen.queryByText(PDF_NOTE)).not.toBeInTheDocument();

    await user.selectOptions(format, "pdf");
    expect(screen.getByText(PDF_NOTE)).toBeInTheDocument();

    await user.click(screen.getByLabelText("Email"));
    expect(screen.queryByText(PDF_NOTE)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Mailing Address"));
    expect(screen.getByText(PDF_NOTE)).toBeInTheDocument();

    await user.click(screen.getByLabelText("Phone"));
    await user.click(screen.getByLabelText("Address"));
    expect(screen.getByText(PDF_NOTE)).toBeInTheDocument();
  });

  it("does not show the picker on other report types", () => {
    renderWithPermissions(PrivilegeLevel.Admin, "vacancyReport");

    expect(screen.queryByText("Include")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mailing Address")).not.toBeInTheDocument();
  });
});
