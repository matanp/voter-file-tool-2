import { PrivilegeLevel } from "@prisma/client";
import {
  GET,
  PATCH,
} from "~/app/api/admin/governance-config/route";
import {
  createMockRequest,
  createMockSession,
  parseJsonResponse,
  expectAuditLogCreate,
  getAuditLogMock,
  createMockGovernanceConfig,
} from "../../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../../utils/mocks";

const governanceConfigMock = prismaMock.committeeGovernanceConfig as {
  findFirst: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
  create: jest.Mock;
  deleteMany: jest.Mock;
};
const dropdownListsMock = prismaMock.dropdownLists as {
  findFirst: jest.Mock;
};

describe("/api/admin/governance-config", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);

    const currentConfig = createMockGovernanceConfig();
    governanceConfigMock.findFirst.mockResolvedValue(currentConfig);
    governanceConfigMock.findMany.mockResolvedValue([currentConfig]);
    governanceConfigMock.update.mockResolvedValue({
      ...currentConfig,
      updatedAt: new Date("2026-02-24T10:00:00.000Z"),
    });
    governanceConfigMock.create.mockResolvedValue({
      ...currentConfig,
      updatedAt: new Date("2026-02-24T10:00:00.000Z"),
    });
    governanceConfigMock.deleteMany.mockResolvedValue({ count: 0 });

    dropdownListsMock.findFirst.mockResolvedValue({
      party: ["DEM", "REP", "WF", "DEM"],
    });
    getAuditLogMock(prismaMock).create.mockResolvedValue({});
  });

  it("GET returns config, authoritative party options, and guardrails", async () => {
    const response = await GET(
      createMockRequest({}, {}, { method: "GET" }),
    );
    expect(response.status).toBe(200);

    const data = await parseJsonResponse<{
      config: { requiredPartyCode: string; maxSeatsPerLted: number };
      partyOptions: string[];
      guardrails: { minMaxSeatsPerLted: number; maxMaxSeatsPerLted: number };
    }>(response);

    expect(data.config.requiredPartyCode).toBe("DEM");
    expect(data.config.maxSeatsPerLted).toBe(4);
    expect(data.partyOptions).toEqual(["DEM", "REP", "WF"]);
    expect(data.guardrails).toEqual({
      minMaxSeatsPerLted: 1,
      maxMaxSeatsPerLted: 12,
    });
  });

  it("PATCH updates config and emits audit event with before/after snapshots", async () => {
    governanceConfigMock.update.mockResolvedValue(
      createMockGovernanceConfig({
        requiredPartyCode: "REP",
        maxSeatsPerLted: 6,
        requireAssemblyDistrictMatch: false,
        nonOverridableIneligibilityReasons: ["PARTY_MISMATCH"],
        updatedAt: new Date("2026-02-24T10:00:00.000Z"),
      }),
    );

    const response = await PATCH(
      createMockRequest(
        {
          requiredPartyCode: "REP",
          maxSeatsPerLted: 6,
          requireAssemblyDistrictMatch: false,
          nonOverridableIneligibilityReasons: ["PARTY_MISMATCH"],
        },
        {},
        { method: "PATCH" },
      ),
    );
    expect(response.status).toBe(200);

    expect(governanceConfigMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "mcdc-default" },
        data: {
          requiredPartyCode: "REP",
          maxSeatsPerLted: 6,
          requireAssemblyDistrictMatch: false,
          nonOverridableIneligibilityReasons: ["PARTY_MISMATCH"],
        },
      }),
    );

    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "GOVERNANCE_CONFIG_UPDATED",
        entityType: "CommitteeGovernanceConfig",
      }),
    );
  });

  it("returns 422 with field-level error when requiredPartyCode is missing", async () => {
    const response = await PATCH(
      createMockRequest(
        {
          requiredPartyCode: "",
          maxSeatsPerLted: 4,
          requireAssemblyDistrictMatch: true,
          nonOverridableIneligibilityReasons: [],
        },
        {},
        { method: "PATCH" },
      ),
    );
    expect(response.status).toBe(422);

    const data = await parseJsonResponse<{
      fieldErrors?: { requiredPartyCode?: string[] };
    }>(response);
    expect(data.fieldErrors?.requiredPartyCode?.[0]).toContain(
      "requiredPartyCode is required",
    );
  });

  it("returns 422 when requiredPartyCode is not in DropdownLists.party", async () => {
    const response = await PATCH(
      createMockRequest(
        {
          requiredPartyCode: "XYZ",
          maxSeatsPerLted: 4,
          requireAssemblyDistrictMatch: true,
          nonOverridableIneligibilityReasons: [],
        },
        {},
        { method: "PATCH" },
      ),
    );
    expect(response.status).toBe(422);

    const data = await parseJsonResponse<{
      fieldErrors?: { requiredPartyCode?: string[] };
    }>(response);
    expect(data.fieldErrors?.requiredPartyCode?.[0]).toContain(
      "must match a value from DropdownLists.party",
    );
  });

  it("returns 422 when maxSeatsPerLted is outside guardrail range", async () => {
    const response = await PATCH(
      createMockRequest(
        {
          requiredPartyCode: "DEM",
          maxSeatsPerLted: 0,
          requireAssemblyDistrictMatch: true,
          nonOverridableIneligibilityReasons: [],
        },
        {},
        { method: "PATCH" },
      ),
    );
    expect(response.status).toBe(422);

    const data = await parseJsonResponse<{
      fieldErrors?: { maxSeatsPerLted?: string[] };
    }>(response);
    expect(data.fieldErrors?.maxSeatsPerLted?.[0]).toContain(
      "must be at least",
    );
  });

  it("returns 422 when requireAssemblyDistrictMatch is not boolean", async () => {
    const response = await PATCH(
      createMockRequest(
        {
          requiredPartyCode: "DEM",
          maxSeatsPerLted: 4,
          requireAssemblyDistrictMatch: "yes",
          nonOverridableIneligibilityReasons: [],
        },
        {},
        { method: "PATCH" },
      ),
    );
    expect(response.status).toBe(422);

    const data = await parseJsonResponse<{
      fieldErrors?: { requireAssemblyDistrictMatch?: string[] };
    }>(response);
    expect(data.fieldErrors?.requireAssemblyDistrictMatch?.[0]).toContain(
      "must be boolean",
    );
  });

  it("returns 422 when nonOverridableIneligibilityReasons contains invalid enum value", async () => {
    const response = await PATCH(
      createMockRequest(
        {
          requiredPartyCode: "DEM",
          maxSeatsPerLted: 4,
          requireAssemblyDistrictMatch: true,
          nonOverridableIneligibilityReasons: ["NOT_A_REASON"],
        },
        {},
        { method: "PATCH" },
      ),
    );
    expect(response.status).toBe(422);

    const data = await parseJsonResponse<{
      fieldErrors?: { nonOverridableIneligibilityReasons?: string[] };
    }>(response);
    expect(data.fieldErrors?.nonOverridableIneligibilityReasons?.[0]).toContain(
      "Invalid enum value",
    );
  });
});
