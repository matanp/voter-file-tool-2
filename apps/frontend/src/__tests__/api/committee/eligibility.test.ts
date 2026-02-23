import { GET } from "~/app/api/committee/eligibility/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockRequest,
  createMockSession,
  createMockVoterRecord,
  parseJsonResponse,
  getMembershipMock,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

describe("/api/committee/eligibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.RequestAccess } }),
    );
    mockHasPermission(true);
    prismaMock.committeeList.findUnique.mockResolvedValue({
      cityTown: "Test City",
      legDistrict: 1,
      electionDistrict: 1,
    });
    prismaMock.ltedDistrictCrosswalk.findUnique.mockResolvedValue({
      stateAssemblyDistrict: "1",
    });
    getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
  });

  it("returns hard-stop preflight payload for ineligible voter", async () => {
    prismaMock.voterRecord.findUnique.mockResolvedValue(
      createMockVoterRecord({
        party: "REP",
        stateAssmblyDistrict: "1",
      }),
    );
    prismaMock.voterRecord.findFirst.mockResolvedValue(null);
    getMembershipMock(prismaMock).count.mockResolvedValue(2);

    const response = await GET(
      createMockRequest(
        {},
        { voterRecordId: "TEST123456", committeeListId: "1" },
        { method: "GET" },
      ),
    );

    const data = await parseJsonResponse<{
      eligible: boolean;
      hardStops: string[];
      warnings: Array<{ code: string; message: string }>;
      snapshot: {
        committee: { activeMemberCount: number; maxSeatsPerLted: number };
        voter: { voterRecordId: string; name: string };
        warningState: string;
      };
    }>(response as Response);

    expect(response.status).toBe(200);
    expect(data.eligible).toBe(false);
    expect(data.hardStops).toContain("PARTY_MISMATCH");
    expect(data.warnings).toHaveLength(0);
    expect(data.snapshot.voter.voterRecordId).toBe("TEST123456");
    expect(data.snapshot.voter.name).toContain("John");
    expect(data.snapshot.committee.activeMemberCount).toBe(2);
    expect(data.snapshot.committee.maxSeatsPerLted).toBe(4);
    expect(data.snapshot.warningState).toBe("NONE");
  });

  it("returns warning preflight payload for eligible voter with non-blocking warning", async () => {
    prismaMock.voterRecord.findUnique.mockResolvedValue(
      createMockVoterRecord({
        party: "DEM",
        stateAssmblyDistrict: "1",
        latestRecordEntryYear: 2024,
        latestRecordEntryNumber: 1,
      }),
    );
    prismaMock.voterRecord.findFirst.mockResolvedValue({
      latestRecordEntryYear: 2024,
      latestRecordEntryNumber: 2,
    });
    getMembershipMock(prismaMock).count.mockResolvedValue(1);

    const response = await GET(
      createMockRequest(
        {},
        { voterRecordId: "TEST123456", committeeListId: "1" },
        { method: "GET" },
      ),
    );

    const data = await parseJsonResponse<{
      eligible: boolean;
      hardStops: string[];
      warnings: Array<{ code: string; message: string }>;
      snapshot: {
        warningState: string;
        committee: { activeMemberCount: number };
      };
    }>(response as Response);

    expect(response.status).toBe(200);
    expect(data.eligible).toBe(true);
    expect(data.hardStops).toHaveLength(0);
    expect(data.warnings.length).toBeGreaterThan(0);
    expect(data.warnings[0]?.code).toBe("POSSIBLY_INACTIVE");
    expect(data.snapshot.warningState).toBe("HAS_WARNINGS");
    expect(data.snapshot.committee.activeMemberCount).toBe(1);
  });
});
