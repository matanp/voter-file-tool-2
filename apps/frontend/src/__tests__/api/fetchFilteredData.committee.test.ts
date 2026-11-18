/**
 * POST /api/fetchFilteredData with Prisma mocked: the `activeCommittee` field
 * added to record search results (ticket 08). Who gets it is decided from the
 * real session role: Admin/Developer for any committee, a Leader for their
 * jurisdictions, ReadAccess/RequestAccess never (the key is absent and no
 * membership query runs). The same rules run against a real database in
 * fetchFilteredData.committee.pg.integration.test.ts.
 */
import {
  PrivilegeLevel,
  type Prisma,
  type UserJurisdiction,
} from "@prisma/client";
import { z } from "zod";
import { searchableFieldEnum } from "@voter-file-tool/shared-validators";
import { POST } from "~/app/api/fetchFilteredData/route";
import type { RECORD_SEARCH_MEMBERSHIP_SELECT } from "~/app/api/lib/recordSearchCommittees";
import { recordSearchCommitteeSchema } from "~/lib/validations/recordSearch";
import {
  createMockRequest,
  createMockSession,
  createMockVoterRecord,
  DEFAULT_ACTIVE_TERM_ID,
  parseJsonResponseWith,
  resolvesTo,
} from "../utils/testUtils";
import {
  mockAuthSession,
  mockRealPermissionHierarchy,
  prismaMock,
} from "../utils/mocks";

/** The membership rows the lookup selects (not a full CommitteeMembership). */
type MembershipRow = Prisma.CommitteeMembershipGetPayload<{
  select: typeof RECORD_SEARCH_MEMBERSHIP_SELECT;
}>;

const responseSchema = z.object({
  data: z.array(
    z
      .object({
        VRCNUM: z.string(),
        activeCommittee: recordSearchCommitteeSchema.optional(),
      })
      .passthrough(),
  ),
  totalRecords: z.number(),
});

const RECORDS = [
  createMockVoterRecord({ VRCNUM: "V1", firstName: "ALEX" }),
  createMockVoterRecord({ VRCNUM: "V2", firstName: "BLAKE" }),
];

const GREECE_1_5: MembershipRow = {
  voterRecordId: "V1",
  committeeList: {
    id: 11,
    cityTown: "GREECE",
    legDistrict: 1,
    electionDistrict: 5,
  },
};

function serveMemberships(rows: MembershipRow[]) {
  prismaMock.committeeMembership.findMany.mockImplementation(() =>
    resolvesTo<MembershipRow[]>(rows),
  );
}

function jurisdictionRow(
  cityTown: string,
  legDistrict: number | null,
): UserJurisdiction {
  return {
    id: `jurisdiction-${cityTown}-${String(legDistrict)}`,
    userId: "test-user-id",
    cityTown,
    legDistrict,
    termId: DEFAULT_ACTIVE_TERM_ID,
    createdAt: new Date("2026-01-01"),
    createdById: "admin-1",
  };
}

function membershipQuery(): Prisma.CommitteeMembershipFindManyArgs {
  const args = prismaMock.committeeMembership.findMany.mock.calls.at(-1)?.[0];
  if (!args) throw new Error("membership query was not issued");
  return args;
}

function signIn(privilegeLevel: PrivilegeLevel) {
  mockAuthSession(createMockSession({ user: { privilegeLevel } }));
}

async function search() {
  const res = await POST(
    createMockRequest({
      searchQuery: [
        { field: searchableFieldEnum.enum.firstName, values: ["ALEX"] },
      ],
      pageSize: 10,
      page: 1,
    }),
  );
  expect(res.status).toBe(200);
  return parseJsonResponseWith(res, responseSchema);
}

beforeEach(() => {
  jest.clearAllMocks();
  // The real hierarchy: withPrivilege admits ReadAccess and up, and the
  // committee lookup runs only for Leader and up.
  mockRealPermissionHierarchy();
  prismaMock.voterRecord.findMany.mockResolvedValue(RECORDS);
  prismaMock.voterRecord.count.mockResolvedValue(RECORDS.length);
  prismaMock.userJurisdiction.findMany.mockResolvedValue([]);
  serveMemberships([GREECE_1_5]);
});

describe("POST /api/fetchFilteredData activeCommittee", () => {
  it.each([PrivilegeLevel.Admin, PrivilegeLevel.Developer])(
    "%s: looks up ACTIVE memberships in the active term for the page, with no jurisdiction filter",
    async (level) => {
      signIn(level);
      const body = await search();

      expect(body.data[0]?.activeCommittee).toEqual({
        committeeListId: 11,
        cityTown: "GREECE",
        legDistrict: 1,
        electionDistrict: 5,
      });
      expect(body.data[1]).not.toHaveProperty("activeCommittee");

      expect(membershipQuery().where).toEqual({
        voterRecordId: { in: ["V1", "V2"] },
        termId: DEFAULT_ACTIVE_TERM_ID,
        status: "ACTIVE",
        committeeList: { termId: DEFAULT_ACTIVE_TERM_ID },
      });
      expect(prismaMock.userJurisdiction.findMany).not.toHaveBeenCalled();
    },
  );

  it("Leader: the committee filter is their jurisdictions (null LD = whole town)", async () => {
    signIn(PrivilegeLevel.Leader);
    prismaMock.userJurisdiction.findMany.mockResolvedValue([
      jurisdictionRow("GREECE", null),
      jurisdictionRow("ROCHESTER", 28),
    ]);
    const body = await search();

    expect(body.data[0]?.activeCommittee?.cityTown).toBe("GREECE");
    expect(membershipQuery().where?.committeeList).toEqual({
      termId: DEFAULT_ACTIVE_TERM_ID,
      OR: [{ cityTown: "GREECE" }, { cityTown: "ROCHESTER", legDistrict: 28 }],
    });
    expect(prismaMock.userJurisdiction.findMany).toHaveBeenCalledWith({
      where: { userId: "test-user-id", termId: DEFAULT_ACTIVE_TERM_ID },
    });
  });

  it("Leader with no jurisdictions: no field and no membership query", async () => {
    signIn(PrivilegeLevel.Leader);
    const body = await search();

    expect(body.data).toHaveLength(2);
    for (const record of body.data) {
      expect(record).not.toHaveProperty("activeCommittee");
    }
    expect(prismaMock.committeeMembership.findMany).not.toHaveBeenCalled();
  });

  it.each([PrivilegeLevel.ReadAccess, PrivilegeLevel.RequestAccess])(
    "%s: records carry no membership data and no lookup runs",
    async (level) => {
      signIn(level);
      const body = await search();
      expect(body.data).toHaveLength(2);
      expect(JSON.stringify(body)).not.toContain("activeCommittee");
      expect(prismaMock.committeeMembership.findMany).not.toHaveBeenCalled();
      expect(prismaMock.userJurisdiction.findMany).not.toHaveBeenCalled();
      expect(prismaMock.committeeTerm.findFirst).not.toHaveBeenCalled();
    },
  );

  it("no active term: results without the field, and no membership query", async () => {
    signIn(PrivilegeLevel.Admin);
    prismaMock.committeeTerm.findFirst.mockResolvedValue(null);
    const body = await search();

    expect(JSON.stringify(body)).not.toContain("activeCommittee");
    expect(prismaMock.committeeMembership.findMany).not.toHaveBeenCalled();
  });

  it("an empty page skips the membership lookup", async () => {
    signIn(PrivilegeLevel.Admin);
    prismaMock.voterRecord.findMany.mockResolvedValue([]);
    prismaMock.voterRecord.count.mockResolvedValue(0);
    const body = await search();

    expect(body.data).toEqual([]);
    expect(prismaMock.committeeMembership.findMany).not.toHaveBeenCalled();
  });
});
