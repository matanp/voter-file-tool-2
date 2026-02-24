import { PrivilegeLevel } from "@prisma/client";
import { PATCH as patchGovernanceConfig } from "~/app/api/admin/governance-config/route";
import { GET as getEligibility } from "~/app/api/committee/eligibility/route";
import {
  createMockRequest,
  createMockSession,
  createMockGovernanceConfig,
  createMockVoterRecord,
  parseJsonResponse,
  getMembershipMock,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";

describe("governance-config update affects downstream eligibility checks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
  });

  it("applies updated maxSeatsPerLted to eligibility capacity hard stop without restart", async () => {
    let configStore = createMockGovernanceConfig({ maxSeatsPerLted: 4 });

    const governanceConfigMock = prismaMock.committeeGovernanceConfig as {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
    governanceConfigMock.findFirst.mockImplementation(async () => configStore);
    governanceConfigMock.findMany.mockImplementation(async () => [configStore]);
    governanceConfigMock.deleteMany.mockResolvedValue({ count: 0 });
    governanceConfigMock.update.mockImplementation(
      async ({ data }: { data: Partial<typeof configStore> }) => {
        configStore = {
          ...configStore,
          ...data,
          updatedAt: new Date("2026-02-24T10:00:00.000Z"),
        };
        return configStore;
      },
    );

    (prismaMock.dropdownLists as { findFirst: jest.Mock }).findFirst.mockResolvedValue({
      party: ["DEM", "REP"],
    });
    (prismaMock.committeeList as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
      cityTown: "Test City",
      legDistrict: 1,
      electionDistrict: 1,
    });
    (prismaMock.ltedDistrictCrosswalk as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
      stateAssemblyDistrict: "1",
    });
    (prismaMock.voterRecord as { findUnique: jest.Mock; findFirst: jest.Mock }).findUnique.mockResolvedValue(
      createMockVoterRecord({
        party: "DEM",
        stateAssmblyDistrict: "1",
      }),
    );
    (prismaMock.voterRecord as { findFirst: jest.Mock }).findFirst.mockResolvedValue(null);

    getMembershipMock(prismaMock).count.mockResolvedValue(3);
    getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);

    const patchResponse = await patchGovernanceConfig(
      createMockRequest(
        {
          requiredPartyCode: "DEM",
          maxSeatsPerLted: 3,
          requireAssemblyDistrictMatch: true,
          nonOverridableIneligibilityReasons: [],
        },
        {},
        { method: "PATCH" },
      ),
    );
    expect(patchResponse.status).toBe(200);

    const eligibilityResponse = await getEligibility(
      createMockRequest(
        {},
        { voterRecordId: "TEST123456", committeeListId: "1" },
        { method: "GET" },
      ),
    );
    expect(eligibilityResponse.status).toBe(200);

    const data = await parseJsonResponse<{
      eligible: boolean;
      hardStops: string[];
      snapshot: { committee: { maxSeatsPerLted: number } };
    }>(eligibilityResponse as Response);

    expect(data.eligible).toBe(false);
    expect(data.hardStops).toContain("CAPACITY");
    expect(data.snapshot.committee.maxSeatsPerLted).toBe(3);
  });
});
