import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GovernanceConfigClient } from "~/app/admin/governance-config/GovernanceConfigClient";
import { mockJsonResponse } from "../../../utils/testUtils";

const initialResponse = {
  config: {
    requiredPartyCode: "DEM",
    maxSeatsPerLted: 4,
    requireAssemblyDistrictMatch: true,
    nonOverridableIneligibilityReasons: [],
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

  it("loads config, shows diff confirmation, and saves successfully", async () => {
    const patchResponse = {
      ...initialResponse,
      config: {
        ...initialResponse.config,
        maxSeatsPerLted: 6,
        updatedAt: "2026-02-24T10:05:00.000Z",
      },
    };

    const fetchMock = jest.fn(
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
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<GovernanceConfigClient />);

    const maxSeatsInput = await screen.findByLabelText(
      /Max seats per LTED/i,
    );
    expect(maxSeatsInput).toHaveValue(4);

    await user.clear(maxSeatsInput);
    await user.type(maxSeatsInput, "6");

    expect(
      screen.getByText("Max seats per LTED: 4 -> 6"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      screen.getByRole("button", { name: "Confirm save" }),
    ).toBeInTheDocument();

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
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("No pending changes.")).toBeInTheDocument();
    });
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

    const maxSeatsInput = await screen.findByLabelText(
      /Max seats per LTED/i,
    );
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
});
