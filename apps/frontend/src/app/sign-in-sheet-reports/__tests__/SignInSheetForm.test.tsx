import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivilegeLevel } from "@prisma/client";
import { mockJsonResponse } from "../../../__tests__/utils/testUtils";
import { hasPermissionFor as realHasPermissionFor } from "~/lib/utils";

// Mock GlobalContext module to avoid next-auth/react ESM import error
let mockActingPermissions: PrivilegeLevel = PrivilegeLevel.Admin;
jest.mock("~/components/providers/GlobalContext", () => {
  const { createContext } = jest.requireActual<{ createContext: typeof React.createContext }>("react");
  const GlobalContext = createContext({
    actingPermissions: PrivilegeLevel.Admin,
    setActingPermissions: jest.fn(),
  });
  // Override useContext behavior by making the context default value dynamic
  // via a proxy so each test can set mockActingPermissions
  return {
    GlobalContext: new Proxy(GlobalContext, {
      get(target, prop) {
        if (prop === "_currentValue" || prop === "_currentValue2") {
          return {
            actingPermissions: mockActingPermissions,
            setActingPermissions: jest.fn(),
          };
        }
        return Reflect.get(target, prop) as unknown;
      },
    }),
  };
});

// Mock ReportStatusTracker (depends on Ably)
jest.mock("~/app/components/ReportStatusTracker", () => ({
  ReportStatusTracker: ({
    reportId,
  }: {
    reportId: string;
    onComplete?: (url: string) => void;
    onError?: (error: string) => void;
  }) => <div data-testid="report-status-tracker">{reportId}</div>,
}));

// Mock toast
const mockToast = jest.fn();
jest.mock("~/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Import after mocks are set up
import { SignInSheetForm } from "../SignInSheetForm";

const MOCK_COMMITTEE_LISTS = [
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
    cityTown: "ROCHESTER",
    legDistrict: 2,
    electionDistrict: 1,
    termId: "term-1",
    ltedWeight: null,
  },
  {
    id: 3,
    cityTown: "GREECE",
    legDistrict: 1,
    electionDistrict: 1,
    termId: "term-1",
    ltedWeight: null,
  },
];

const mockedHasPermissionFor = jest.mocked(
  realHasPermissionFor,
) as jest.MockedFunction<typeof realHasPermissionFor>;

describe("SignInSheetForm", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockActingPermissions = PrivilegeLevel.Admin;
    // Use real implementation of hasPermissionFor
    mockedHasPermissionFor.mockImplementation(
      jest.requireActual<{ hasPermissionFor: typeof realHasPermissionFor }>("~/lib/utils")
        .hasPermissionFor,
    );
    global.fetch = jest.fn().mockResolvedValue(
      mockJsonResponse({ reportId: "report-123" }),
    ) as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("renders with default report name containing today's date", () => {
    render(
      <SignInSheetForm
        committeeLists={MOCK_COMMITTEE_LISTS}
        userPrivilegeLevel={PrivilegeLevel.Admin}
      />,
    );

    const nameInput = screen.getByLabelText("Report Name");
    expect(nameInput).toHaveDisplayValue(/Sign-In Sheet/);
    expect(nameInput).toHaveDisplayValue(/Sign-In Sheet - .+/);
  });

  it("shows scope selector for Admin users", () => {
    render(
      <SignInSheetForm
        committeeLists={MOCK_COMMITTEE_LISTS}
        userPrivilegeLevel={PrivilegeLevel.Admin}
      />,
    );

    expect(screen.getByText("Countywide")).toBeInTheDocument();
    expect(screen.getByText("By Jurisdiction")).toBeInTheDocument();
  });

  it("hides scope selector for Leader users", () => {
    mockActingPermissions = PrivilegeLevel.Leader;
    render(
      <SignInSheetForm
        committeeLists={MOCK_COMMITTEE_LISTS}
        userPrivilegeLevel={PrivilegeLevel.Leader}
      />,
    );

    expect(screen.queryByText("Countywide")).not.toBeInTheDocument();
    expect(screen.queryByText("By Jurisdiction")).not.toBeInTheDocument();
  });

  it("validates that cityTown is required when scope is jurisdiction", async () => {
    const user = userEvent.setup();

    render(
      <SignInSheetForm
        committeeLists={MOCK_COMMITTEE_LISTS}
        userPrivilegeLevel={PrivilegeLevel.Admin}
      />,
    );

    // Switch to jurisdiction scope
    await user.click(screen.getByText("By Jurisdiction"));

    // Submit without selecting city
    await user.click(screen.getByRole("button", { name: "Generate PDF" }));

    expect(
      screen.getByText("City/Town selection is required for jurisdiction scope"),
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("validates that report name is required", async () => {
    const user = userEvent.setup();

    render(
      <SignInSheetForm
        committeeLists={MOCK_COMMITTEE_LISTS}
        userPrivilegeLevel={PrivilegeLevel.Admin}
      />,
    );

    const nameInput = screen.getByLabelText("Report Name");
    await user.clear(nameInput);

    await user.click(screen.getByRole("button", { name: "Generate PDF" }));

    expect(screen.getByText("Report name is required")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits countywide report with correct payload", async () => {
    const user = userEvent.setup();

    render(
      <SignInSheetForm
        committeeLists={MOCK_COMMITTEE_LISTS}
        userPrivilegeLevel={PrivilegeLevel.Admin}
      />,
    );

    // Admin default scope is countywide, just submit
    await user.click(screen.getByRole("button", { name: "Generate PDF" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      { body?: string },
    ];
    expect(url).toBe("/api/generateReport");
    const body = JSON.parse(options.body ?? "{}") as Record<string, unknown>;
    expect(body.type).toBe("signInSheet");
    expect(body.format).toBe("pdf");
    expect(body.scope).toBe("countywide");
    expect(body.name).toContain("Sign-In Sheet");
  });

  it("shows ReportStatusTracker after successful submission", async () => {
    const user = userEvent.setup();

    render(
      <SignInSheetForm
        committeeLists={MOCK_COMMITTEE_LISTS}
        userPrivilegeLevel={PrivilegeLevel.Admin}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Generate PDF" }));

    await waitFor(() => {
      expect(
        screen.getByTestId("report-status-tracker"),
      ).toBeInTheDocument();
    });
  });

  it("shows City/Town dropdown for Leader users", () => {
    mockActingPermissions = PrivilegeLevel.Leader;
    render(
      <SignInSheetForm
        committeeLists={MOCK_COMMITTEE_LISTS}
        userPrivilegeLevel={PrivilegeLevel.Leader}
      />,
    );

    expect(screen.getByText("City/Town")).toBeInTheDocument();
    expect(screen.getByText("Select City/Town")).toBeInTheDocument();
  });

  it("shows meeting date field", () => {
    render(
      <SignInSheetForm
        committeeLists={MOCK_COMMITTEE_LISTS}
        userPrivilegeLevel={PrivilegeLevel.Admin}
      />,
    );

    expect(
      screen.getByLabelText("Meeting Date (optional)"),
    ).toBeInTheDocument();
  });
});
