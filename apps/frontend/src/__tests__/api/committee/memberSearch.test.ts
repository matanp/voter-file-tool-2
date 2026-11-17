/**
 * GET /api/committee/memberSearch with Prisma mocked: auth, the query's scope
 * (term, statuses, jurisdictions from the real session role, name words), the
 * no-jurisdiction short-circuit, result mapping and truncation. The same rules
 * run against a real database in memberSearch.pg.integration.test.ts.
 */
import { PrivilegeLevel } from "@prisma/client";
import { GET } from "~/app/api/committee/memberSearch/route";
import {
  MEMBER_SEARCH_LIMIT,
  memberSearchResponseSchema,
  memberSearchTerms,
} from "~/lib/validations/committee";
import {
  createAuthTestSuite,
  createMockRequest,
  createMockSession,
  DEFAULT_ACTIVE_TERM_ID,
  parseJsonResponseWith,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

type FindManyMock = { findMany: jest.Mock };
const membershipMock = () =>
  (prismaMock as unknown as { committeeMembership: FindManyMock })
    .committeeMembership;
const jurisdictionMock = () =>
  (prismaMock as unknown as { userJurisdiction: FindManyMock })
    .userJurisdiction;

type WhereArg = {
  where: {
    termId: string;
    status: { in: string[] };
    committeeList: Record<string, unknown>;
    voterRecord: unknown;
  };
  take: number;
};
const lastQuery = () =>
  (membershipMock().findMany.mock.calls.at(-1) as [WhereArg])[0];

function signIn(privilegeLevel: PrivilegeLevel) {
  mockAuthSession(createMockSession({ user: { privilegeLevel } }));
  mockHasPermission(true);
}

const request = (q?: string) =>
  createMockRequest({}, q === undefined ? {} : { q }, { method: "GET" });

function row(n: number, status = "ACTIVE") {
  return {
    id: `m${String(n)}`,
    status,
    voterRecord: { firstName: "Jane", lastName: `Smith${String(n)}` },
    committeeList: {
      id: n,
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: n,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  membershipMock().findMany.mockResolvedValue([]);
  jurisdictionMock().findMany.mockResolvedValue([]);
});

describe("GET /api/committee/memberSearch auth", () => {
  const suite = createAuthTestSuite(
    {
      endpointName: "GET /api/committee/memberSearch",
      requiredPrivilege: PrivilegeLevel.Leader,
      mockRequest: () => request("smith"),
    },
    GET as (req: Parameters<typeof GET>[0]) => Promise<Response>,
    mockAuthSession,
    mockHasPermission,
  );
  for (const { description, runTest } of suite) it(description, runTest);

  it("does not query members for a ReadAccess caller", async () => {
    mockAuthSession(
      createMockSession({
        user: { privilegeLevel: PrivilegeLevel.ReadAccess },
      }),
    );
    mockHasPermission(false);
    expect((await GET(request("smith"))).status).toBe(403);
    expect(membershipMock().findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/committee/memberSearch query", () => {
  it.each([undefined, "", " a "])("rejects q=%p with 400", async (q) => {
    signIn(PrivilegeLevel.Admin);
    expect((await GET(request(q))).status).toBe(400);
    expect(membershipMock().findMany).not.toHaveBeenCalled();
  });

  it("rejects an over-long q with 400", async () => {
    signIn(PrivilegeLevel.Admin);
    expect((await GET(request("x".repeat(61)))).status).toBe(400);
  });

  it("Admin: active term and searchable statuses, no jurisdiction filter", async () => {
    signIn(PrivilegeLevel.Admin);
    await GET(request("smith"));
    const { where, take } = lastQuery();
    expect(where.termId).toBe(DEFAULT_ACTIVE_TERM_ID);
    expect(where.status.in.sort()).toEqual([
      "ACTIVE",
      "CONFIRMED",
      "SUBMITTED",
    ]);
    expect(where.committeeList).toEqual({ termId: DEFAULT_ACTIVE_TERM_ID });
    expect(take).toBe(MEMBER_SEARCH_LIMIT + 1);
    expect(jurisdictionMock().findMany).not.toHaveBeenCalled();
  });

  it("Leader: the committee filter is their jurisdictions (null LD = whole town)", async () => {
    signIn(PrivilegeLevel.Leader);
    jurisdictionMock().findMany.mockResolvedValue([
      { cityTown: "GREECE", legDistrict: null },
      { cityTown: "ROCHESTER", legDistrict: 28 },
    ]);
    await GET(request("smith"));
    expect(lastQuery().where.committeeList).toEqual({
      termId: DEFAULT_ACTIVE_TERM_ID,
      OR: [{ cityTown: "GREECE" }, { cityTown: "ROCHESTER", legDistrict: 28 }],
    });
    expect(jurisdictionMock().findMany).toHaveBeenCalledWith({
      where: { userId: "test-user-id", termId: DEFAULT_ACTIVE_TERM_ID },
    });
  });

  it("Leader with no jurisdictions: empty result without querying members", async () => {
    signIn(PrivilegeLevel.Leader);
    const res = await GET(request("smith"));
    expect(res.status).toBe(200);
    const body = await parseJsonResponseWith(res, memberSearchResponseSchema);
    expect(body).toEqual({ hits: [], truncated: false });
    expect(membershipMock().findMany).not.toHaveBeenCalled();
  });

  it("every word must match the first or last name, case-insensitively", async () => {
    signIn(PrivilegeLevel.Admin);
    await GET(request("  Doe,  Jane "));
    expect(lastQuery().where.voterRecord).toEqual({
      AND: ["Doe", "Jane"].map((term) => ({
        OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
        ],
      })),
    });
  });

  it("maps rows to hits, labels SUBMITTED/CONFIRMED pending, and caps with truncated", async () => {
    signIn(PrivilegeLevel.Admin);
    const rows = Array.from({ length: MEMBER_SEARCH_LIMIT + 1 }, (_, i) =>
      row(i + 1, i === 1 ? "SUBMITTED" : i === 2 ? "CONFIRMED" : "ACTIVE"),
    );
    membershipMock().findMany.mockResolvedValue(rows);
    const body = await parseJsonResponseWith(
      await GET(request("smith")),
      memberSearchResponseSchema,
    );
    expect(body.truncated).toBe(true);
    expect(body.hits).toHaveLength(MEMBER_SEARCH_LIMIT);
    expect(body.hits.slice(0, 3).map((h) => h.status)).toEqual([
      "active",
      "pending",
      "pending",
    ]);
    expect(body.hits[0]).toEqual({
      membershipId: "m1",
      committeeListId: 1,
      firstName: "Jane",
      lastName: "Smith1",
      status: "active",
      cityTown: "GREECE",
      legDistrict: 1,
      electionDistrict: 1,
    });
  });

  it("returns 500 without echoing the query when the database fails", async () => {
    signIn(PrivilegeLevel.Admin);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    membershipMock().findMany.mockRejectedValue(new Error("boom"));
    const res = await GET(request("smith"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("smith");
  });
});

describe("memberSearchTerms", () => {
  it("splits on spaces and commas and keeps at most four words", () => {
    expect(memberSearchTerms("a, b  c,d e")).toEqual(["a", "b", "c", "d"]);
  });
});
