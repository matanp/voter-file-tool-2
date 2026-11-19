/**
 * POST /api/fetchFilteredData with Prisma mocked: the `activeCommittee` field
 * added to record search results (ticket 08). Only a request with
 * `includeCommittee: true` (the record search page) gets it. Who gets it is
 * decided from the real session role: Admin/Developer for any committee, a
 * Leader for their assignments, ReadAccess/RequestAccess never (the key is
 * absent and no membership query runs). The same rules run against a real
 * database in fetchFilteredData.committee.pg.integration.test.ts.
 *
 * There is no acting-as case: `actingPermissions` lives only in the browser
 * and no request carries it, so the route sees the real role whatever the
 * Developer is acting as. RecordsList.committeeBadge.test.tsx covers the
 * page hiding the badge.
 */
import { PrivilegeLevel, type Prisma } from "@prisma/client";
import { z } from "zod";
import { searchableFieldEnum } from "@voter-file-tool/shared-validators";
import { POST } from "~/app/api/fetchFilteredData/route";
import type { RECORD_SEARCH_MEMBERSHIP_SELECT } from "~/app/api/lib/recordSearchCommittees";
import type { RecordSearchCommittee } from "~/lib/validations/recordSearch";
import {
  createMockRequest,
  createMockSession,
  createMockVoterRecord,
  DEFAULT_ACTIVE_TERM_ID,
  firstCallArg,
  parseJsonResponseWith,
  resolvesTo,
} from "../utils/testUtils";
import {
  jurisdictionRow,
  mockAuthSession,
  mockRealPermissionHierarchy,
  prismaMock,
} from "../utils/mocks";

/** The membership rows the lookup selects (not a full CommitteeMembership). */
type MembershipRow = Prisma.CommitteeMembershipGetPayload<{
  select: typeof RECORD_SEARCH_MEMBERSHIP_SELECT;
}>;

const committeeSchema = z.object({
  committeeListId: z.number().int(),
  cityTown: z.string(),
  legDistrict: z.number().int(),
  electionDistrict: z.number().int(),
}) satisfies z.ZodType<RecordSearchCommittee>;

const responseSchema = z.object({
  data: z.array(
    z
      .object({
        VRCNUM: z.string(),
        activeCommittee: committeeSchema.optional(),
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

function membershipQuery(): Prisma.CommitteeMembershipFindManyArgs {
  expect(prismaMock.committeeMembership.findMany).toHaveBeenCalledTimes(1);
  return firstCallArg<Prisma.CommitteeMembershipFindManyArgs>(
    prismaMock.committeeMembership.findMany,
  );
}

function signIn(privilegeLevel: PrivilegeLevel) {
  mockAuthSession(createMockSession({ user: { privilegeLevel } }));
}

async function search(extra: Record<string, unknown> = { includeCommittee: true }) {
  const res = await POST(
    createMockRequest({
      searchQuery: [
        { field: searchableFieldEnum.enum.firstName, values: ["ALEX"] },
      ],
      pageSize: 10,
      page: 1,
      ...extra,
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

  it("Leader: the committee filter is their assignments (null LD = whole town)", async () => {
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

  it("Leader with no assignments: no field and no membership query", async () => {
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

  it.each([
    ["omitted", {}],
    ["false", { includeCommittee: false }],
  ])(
    "includeCommittee %s: Admin gets no field and no lookup runs",
    async (_label, extra) => {
      signIn(PrivilegeLevel.Admin);
      const body = await search(extra);

      expect(body.data).toHaveLength(2);
      expect(JSON.stringify(body)).not.toContain("activeCommittee");
      expect(prismaMock.committeeTerm.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.committeeMembership.findMany).not.toHaveBeenCalled();
    },
  );

  it("rejects a non-boolean includeCommittee", async () => {
    signIn(PrivilegeLevel.Admin);
    const res = await POST(
      createMockRequest({
        searchQuery: [],
        pageSize: 10,
        page: 1,
        includeCommittee: "yes",
      }),
    );
    expect(res.status).toBe(422);
    expect(prismaMock.voterRecord.findMany).not.toHaveBeenCalled();
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
