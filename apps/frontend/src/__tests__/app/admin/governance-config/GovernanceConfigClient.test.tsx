import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GovernanceConfigClient } from "~/app/admin/governance-config/GovernanceConfigClient";
import { mockJsonResponse } from "../../../utils/testUtils";
import { installFetchMock } from "../../../utils/mocks";

const initialResponse = {
  config: {
    requiredPartyCode: "DEM",
    maxSeatsPerLted: 4,
    requireAssemblyDistrictMatch: true,
    nonOverridableIneligibilityReasons: [],
    exitReportInstructions: null,
    updatedAt: "2026-02-24T10:00:00.000Z",
  },
  partyOptions: ["DEM", "REP", "WF"],
  guardrails: {
    minMaxSeatsPerLted: 1,
    maxMaxSeatsPerLted: 12,
  },
};

describe("GovernanceConfigClient", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("loads config, shows pending diff, and saves after modal confirmation", async () => {
    const patchResponse = {
      ...initialResponse,
      config: {
        ...initialResponse.config,
        maxSeatsPerLted: 6,
        updatedAt: "2026-02-24T10:05:00.000Z",
      },
    };

    const fetchMock = installFetchMock(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (method === "GET" && url === "/api/admin/governance-config") {
          return mockJsonResponse(initialResponse);
        }
        if (method === "PATCH" && url === "/api/admin/governance-config") {
          return mockJsonResponse(patchResponse);
        }
        throw new Error(`Unexpected fetch call: ${method} ${url}`);
      },
    );

    const user = userEvent.setup();
    render(<GovernanceConfigClient />);

    const maxSeatsInput = await screen.findByLabelText(/Max seats per LTED/i);
    expect(maxSeatsInput).toHaveValue(4);

    await user.clear(maxSeatsInput);
    await user.type(maxSeatsInput, "6");

    expect(screen.getByText("Max seats per LTED: 4 -> 6")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    const confirmDialog = screen.getByRole("alertdialog", {
      name: "Confirm governance changes",
    });
    expect(confirmDialog).toBeInTheDocument();
    expect(
      within(confirmDialog).getByText("Max seats per LTED: 4 -> 6"),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some((call) => call[1]?.method === "PATCH"),
    ).toBe(false);

    await user.click(
      within(confirmDialog).getByRole("button", { name: "Cancel" }),
    );
    expect(
      screen.queryByRole("alertdialog", {
        name: "Confirm governance changes",
      }),
    ).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some((call) => call[1]?.method === "PATCH"),
    ).toBe(false);

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await user.click(screen.getByRole("button", { name: "Confirm save" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/governance-config",
        expect.objectContaining({
          method: "PATCH",
        }),
      );
    });

    const patchCall = fetchMock.mock.calls.find(
      (call) => call[1]?.method === "PATCH",
    );
    expect(patchCall?.[1]?.body).toBe(
      JSON.stringify({
        requiredPartyCode: "DEM",
        maxSeatsPerLted: 6,
        requireAssemblyDistrictMatch: true,
        nonOverridableIneligibilityReasons: [],
        // Unset instructions go out blank; the server stores blank as null.
        exitReportInstructions: "",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("No pending changes.")).toBeInTheDocument();
    });
  });

  it("edits the exit report instructions and saves them with the config", async () => {
    const instructions = "Email the letter to chair@example.org.";
    const patchResponse = {
      ...initialResponse,
      config: {
        ...initialResponse.config,
        exitReportInstructions: instructions,
        updatedAt: "2026-02-24T10:05:00.000Z",
      },
    };
    const fetchMock = installFetchMock(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        if (String(input) !== "/api/admin/governance-config") {
          throw new Error(`Unexpected fetch call: ${method} ${String(input)}`);
        }
        return mockJsonResponse(
          method === "PATCH" ? patchResponse : initialResponse,
        );
      },
    );

    const user = userEvent.setup();
    render(<GovernanceConfigClient />);

    const textarea = await screen.findByLabelText(
      "Exit report instructions for Leaders",
    );
    await user.type(textarea, instructions);
    expect(
      screen.getByText("Exit report instructions: updated"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await user.click(screen.getByRole("button", { name: "Confirm save" }));

    await waitFor(() => {
      expect(screen.getByText("No pending changes.")).toBeInTheDocument();
    });
    const patchCall = fetchMock.mock.calls.find(
      (call) => call[1]?.method === "PATCH",
    );
    const sent = JSON.parse(String(patchCall?.[1]?.body)) as {
      exitReportInstructions?: unknown;
    };
    expect(sent.exitReportInstructions).toBe(instructions);
    expect(textarea).toHaveValue(instructions);
  });

  it("renders field-level validation errors when save fails", async () => {
    const fetchMock = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (method === "GET" && url === "/api/admin/governance-config") {
          return mockJsonResponse(initialResponse);
        }
        if (method === "PATCH" && url === "/api/admin/governance-config") {
          return mockJsonResponse(
            {
              error: "Validation failed",
              fieldErrors: {
                maxSeatsPerLted: ["maxSeatsPerLted must be at least 1"],
              },
            },
            { status: 422 },
          );
        }
        throw new Error(`Unexpected fetch call: ${method} ${url}`);
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<GovernanceConfigClient />);

    const maxSeatsInput = await screen.findByLabelText(/Max seats per LTED/i);
    await user.clear(maxSeatsInput);
    await user.type(maxSeatsInput, "0");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await user.click(screen.getByRole("button", { name: "Confirm save" }));

    await waitFor(() => {
      expect(
        screen.getByText("maxSeatsPerLted must be at least 1"),
      ).toBeInTheDocument();
    });
  });
  it("treats a successful save with an unreadable body as saved and reloads the settings", async () => {
    const saved = {
      ...initialResponse,
      config: { ...initialResponse.config, maxSeatsPerLted: 6 },
    };
    let gets = 0;
    installFetchMock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (String(input) !== "/api/admin/governance-config") {
        throw new Error(`Unexpected fetch call: ${method} ${String(input)}`);
      }
      if (method === "PATCH") {
        // A response shape the client doesn't know (e.g. a new enum value).
        return mockJsonResponse({
          ...saved,
          config: { ...saved.config, nonOverridableIneligibilityReasons: ["SOMETHING_NEW"] },
        });
      }
      gets += 1;
      return mockJsonResponse(gets === 1 ? initialResponse : saved);
    });

    const user = userEvent.setup();
    render(<GovernanceConfigClient />);

    const maxSeatsInput = await screen.findByLabelText(/Max seats per LTED/i);
    await user.clear(maxSeatsInput);
    await user.type(maxSeatsInput, "6");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await user.click(screen.getByRole("button", { name: "Confirm save" }));

    await waitFor(() => expect(gets).toBe(2));
    await waitFor(() => {
      expect(screen.getByText("No pending changes.")).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Max seats per LTED/i)).toHaveValue(6);
    expect(screen.queryByText(/Save failed/)).not.toBeInTheDocument();
  });
  it("shows the load error instead of the form when the settings can't be read", async () => {
    installFetchMock(async () =>
      mockJsonResponse({ ...initialResponse, guardrails: undefined }),
    );
    render(<GovernanceConfigClient />);
    expect(
      await screen.findByText("Could not read the governance settings"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Max seats per LTED/i)).not.toBeInTheDocument();
  });
});
