import { PrivilegeLevel, MembershipStatus, Prisma } from "@prisma/client";
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
  getMembershipMock,
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
const committeeTermMock = prismaMock.committeeTerm as {
  findFirst: jest.Mock;
};

function getCommitteeListMock(): {
  findMany: jest.Mock;
  findUnique: jest.Mock;
} {
  return prismaMock.committeeList as {
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
}

function getSeatMock(): {
  findMany: jest.Mock;
  createMany: jest.Mock;
  deleteMany: jest.Mock;
  updateMany: jest.Mock;
} {
  return prismaMock.seat as {
    findMany: jest.Mock;
    createMany: jest.Mock;
    deleteMany: jest.Mock;
    updateMany: jest.Mock;
  };
}

/** Mocks active-term reconciliation to succeed for max-seat changes. */
function mockSuccessfulSeatReconciliation(): void {
  const committeeListMock = getCommitteeListMock();
  const seatMock = getSeatMock();
  const committeeMembershipMock = getMembershipMock(prismaMock);

  committeeListMock.findMany.mockResolvedValue([{ id: 1 }]);
  committeeListMock.findUnique.mockResolvedValue({ ltedWeight: 128 });
  committeeMembershipMock.findMany.mockResolvedValue([]);
  seatMock.findMany.mockImplementation(
    async ({
      where,
    }: {
      where: {
        termId?: string;
        seatNumber?: { gt?: number };
        isPetitioned?: boolean;
        committeeListId?: { in: number[] };
      };
    }) => {
      if (where.isPetitioned === true) {
        return [];
      }
      if (where.committeeListId?.in != null) {
        return [1, 2, 3, 4].map((seatNumber) => ({
          committeeListId: 1,
          seatNumber,
        }));
      }
      if (where.seatNumber?.gt != null) {
        return [];
      }
      return [];
    },
  );
  seatMock.createMany.mockResolvedValue({ count: 2 });
  seatMock.deleteMany.mockResolvedValue({ count: 0 });
  seatMock.updateMany.mockResolvedValue({ count: 4 });
  committeeTermMock.findFirst.mockResolvedValue({
    id: "term-default-2024-2026",
    label: "2024–2026",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2026-12-31"),
    isActive: true,
    createdAt: new Date(),
  });
}

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
    mockSuccessfulSeatReconciliation();
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
        metadata: expect.objectContaining({
          reconciliation: expect.objectContaining({
            direction: "increase",
          }),
        }) as Prisma.InputJsonValue,
      }),
    );
  });

  it("PATCH does not reconcile when maxSeatsPerLted is unchanged", async () => {
    const response = await PATCH(
      createMockRequest(
        {
          requiredPartyCode: "REP",
          maxSeatsPerLted: 4,
          requireAssemblyDistrictMatch: true,
          nonOverridableIneligibilityReasons: [],
        },
        {},
        { method: "PATCH" },
      ),
    );
    expect(response.status).toBe(200);
    expect(getCommitteeListMock().findMany).not.toHaveBeenCalled();
  });

  it("PATCH for non-seat config fields succeeds without an active term", async () => {
    committeeTermMock.findFirst.mockResolvedValue(null);

    const response = await PATCH(
      createMockRequest(
        {
          requiredPartyCode: "REP",
          maxSeatsPerLted: 4,
          requireAssemblyDistrictMatch: false,
          nonOverridableIneligibilityReasons: ["PARTY_MISMATCH"],
        },
        {},
        { method: "PATCH" },
      ),
    );
    expect(response.status).toBe(200);
    expect(getCommitteeListMock().findMany).not.toHaveBeenCalled();
  });

  it("PATCH changing maxSeatsPerLted returns 422 when no active term exists", async () => {
    committeeTermMock.findFirst.mockResolvedValue(null);

    const response = await PATCH(
      createMockRequest(
        {
          requiredPartyCode: "DEM",
          maxSeatsPerLted: 6,
          requireAssemblyDistrictMatch: true,
          nonOverridableIneligibilityReasons: [],
        },
        {},
        { method: "PATCH" },
      ),
    );
    expect(response.status).toBe(422);

    const data = await parseJsonResponse<{
      success: boolean;
      fieldErrors?: { maxSeatsPerLted?: string[] };
    }>(response);
    expect(data.success).toBe(false);
    expect(data.fieldErrors?.maxSeatsPerLted?.[0]).toContain(
      "Cannot change maxSeatsPerLted without an active committee term",
    );
    expect(governanceConfigMock.update).not.toHaveBeenCalled();
  });

  it("PATCH returns deterministic conflict response when decrease is blocked", async () => {
    getMembershipMock(prismaMock).findMany.mockImplementation(
      async ({
        where,
      }: {
        where: {
          seatNumber?: { gt?: number };
          status?: MembershipStatus;
          termId?: string;
        };
      }) => {
        if (
          where.seatNumber?.gt != null &&
          where.status === MembershipStatus.ACTIVE
        ) {
          return [
            {
              committeeListId: 1,
              committeeList: {
                cityTown: "GREECE",
                legDistrict: 1,
                electionDistrict: 1,
              },
            },
          ];
        }
        return [];
      },
    );
    getSeatMock().findMany.mockImplementation(
      async ({
        where,
      }: {
        where: {
          termId?: string;
          seatNumber?: { gt?: number };
          isPetitioned?: boolean;
        };
      }) => {
        if (where.isPetitioned === true) {
          return [];
        }
        return [];
      },
    );

    const response = await PATCH(
      createMockRequest(
        {
          requiredPartyCode: "DEM",
          maxSeatsPerLted: 2,
          requireAssemblyDistrictMatch: true,
          nonOverridableIneligibilityReasons: [],
        },
        {},
        { method: "PATCH" },
      ),
    );
    expect(response.status).toBe(409);

    const data = await parseJsonResponse<{
      success: boolean;
      error: string;
      conflict: {
        activeMembershipsOverMaxCount: number;
        sampleCommittees: Array<{ committeeListId: number; cityTown: string }>;
      };
    }>(response);
    expect(data.success).toBe(false);
    expect(data.conflict.activeMembershipsOverMaxCount).toBe(1);
    expect(data.conflict.sampleCommittees[0]?.cityTown).toBe("GREECE");
    expect(governanceConfigMock.update).not.toHaveBeenCalled();
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
