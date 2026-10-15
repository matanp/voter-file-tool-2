/**
 * Committee detail read model — route tests for
 * GET /api/committee/[committeeListId]/detail. See plan §5 "Detail" / §12.1
 * and .scratch/committees-workspace/history-inventory.md §4.
 */

import { PrivilegeLevel, Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { GET } from "~/app/api/committee/[committeeListId]/detail/route";
import {
  committeeDetailResponseSchema,
  COMMITTEE_DETAIL_HISTORY_LIMIT,
  type CommitteeDetailResponse,
  type HistoryEvent,
} from "~/lib/validations/committee";
import {
  createMockSession,
  createMockRequest,
  createAuthTestSuite,
  expectErrorResponse,
  parseJsonResponse,
  parseJsonResponseWith,
  getAuditLogMock,
  getMembershipMock,
  getMeetingRecordMock,
  DEFAULT_ACTIVE_TERM_ID,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

jest.mock("@sentry/nextjs", () => ({ captureException: jest.fn() }));

type CommitteeListMock = { findUnique: jest.Mock };
type UserJurisdictionMock = { findMany: jest.Mock };

function getCommitteeListMock(): CommitteeListMock {
  return (prismaMock as unknown as { committeeList: CommitteeListMock })
    .committeeList;
}

function getUserJurisdictionMock(): UserJurisdictionMock {
  return (prismaMock as unknown as { userJurisdiction: UserJurisdictionMock })
    .userJurisdiction;
}

// --- Fixtures ----------------------------------------------------------------

const TERM = {
  id: DEFAULT_ACTIVE_TERM_ID,
  label: "2024–2026",
  startDate: new Date("2024-01-01T00:00:00.000Z"),
  endDate: new Date("2026-12-31T00:00:00.000Z"),
  isActive: true,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
};

const ADMIN_USER_ID = "admin-user-id";
const LEADER_USER_ID = "leader-user-id";

function mockSeat(overrides: {
  seatNumber: number;
  isPetitioned?: boolean;
  weight?: number | null;
}) {
  return {
    id: `seat-${String(overrides.seatNumber)}`,
    committeeListId: 1,
    termId: DEFAULT_ACTIVE_TERM_ID,
    seatNumber: overrides.seatNumber,
    isPetitioned: overrides.isPetitioned ?? false,
    weight:
      overrides.weight != null ? new Prisma.Decimal(overrides.weight) : null,
  };
}

function mockVoter(overrides: {
  VRCNUM: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  telephone?: string | null;
}) {
  return {
    VRCNUM: overrides.VRCNUM,
    firstName: overrides.firstName ?? "Jane",
    middleInitial: null,
    lastName: overrides.lastName ?? "Doe",
    email: overrides.email ?? null,
    telephone: overrides.telephone ?? null,
  };
}

/** A membership as the route's three membership queries each see it. */
function mockMembership(overrides: {
  id: string;
  VRCNUM: string;
  status?: string;
  seatNumber?: number | null;
  membershipType?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  telephone?: string | null;
  submissionMetadata?: Record<string, unknown> | null;
  submittedAt?: Date;
  submittedById?: string | null;
  submittedByName?: string | null;
  petitionSeatNumber?: number | null;
  petitionPrimaryDate?: Date | null;
  petitionVoteCount?: number | null;
}) {
  return {
    id: overrides.id,
    voterRecordId: overrides.VRCNUM,
    committeeListId: 1,
    termId: DEFAULT_ACTIVE_TERM_ID,
    status: overrides.status ?? "ACTIVE",
    seatNumber: overrides.seatNumber ?? null,
    membershipType: overrides.membershipType ?? "APPOINTED",
    submissionMetadata: overrides.submissionMetadata ?? null,
    submittedAt: overrides.submittedAt ?? new Date("2025-03-01T12:00:00.000Z"),
    submittedById: overrides.submittedById ?? null,
    submittedBy:
      overrides.submittedById != null
        ? {
            id: overrides.submittedById,
            name: overrides.submittedByName ?? null,
          }
        : null,
    petitionSeatNumber: overrides.petitionSeatNumber ?? null,
    petitionPrimaryDate: overrides.petitionPrimaryDate ?? null,
    petitionVoteCount: overrides.petitionVoteCount ?? null,
    voterRecord: mockVoter(overrides),
  };
}

type Membership = ReturnType<typeof mockMembership>;

function mockCommittee(overrides: {
  id?: number;
  cityTown?: string;
  legDistrict?: number;
  electionDistrict?: number;
  termId?: string;
  ltedWeight?: number | null;
  seats?: ReturnType<typeof mockSeat>[];
  memberships?: Membership[];
}) {
  const memberships = overrides.memberships ?? [];
  return {
    id: overrides.id ?? 1,
    cityTown: overrides.cityTown ?? "Test City",
    legDistrict: overrides.legDistrict ?? 1,
    electionDistrict: overrides.electionDistrict ?? 1,
    termId: overrides.termId ?? DEFAULT_ACTIVE_TERM_ID,
    ltedWeight:
      overrides.ltedWeight != null
        ? new Prisma.Decimal(overrides.ltedWeight)
        : null,
    term: TERM,
    seats: overrides.seats ?? [],
    // What the include returns: ACTIVE memberships only.
    memberships: memberships.filter((m) => m.status === "ACTIVE"),
  };
}

type MembershipFindManyArgs = {
  where?: { status?: string; membershipType?: string } & Record<
    string,
    unknown
  >;
};

/**
 * Serves the committee and its memberships to every query the route issues:
 * committeeList.findUnique (ACTIVE only), and committeeMembership.findMany
 * dispatched on `where` (SUBMITTED → pending, PETITIONED → petition context,
 * otherwise every membership for history).
 */
function mockCommitteeWithMemberships(
  committee: ReturnType<typeof mockCommittee>,
  memberships: Membership[],
) {
  getCommitteeListMock().findUnique.mockResolvedValue(committee);
  getMembershipMock(prismaMock).findMany.mockImplementation(
    (args: MembershipFindManyArgs) => {
      if (args.where?.status === "SUBMITTED") {
        return Promise.resolve(
          memberships.filter((m) => m.status === "SUBMITTED"),
        );
      }
      if (args.where?.membershipType === "PETITIONED") {
        return Promise.resolve(
          memberships.filter(
            (m) =>
              m.membershipType === "PETITIONED" && m.petitionSeatNumber != null,
          ),
        );
      }
      return Promise.resolve(memberships);
    },
  );
}

function membershipFindManyCalls(): MembershipFindManyArgs[] {
  return getMembershipMock(prismaMock).findMany.mock.calls.map(
    (call) => (call as [MembershipFindManyArgs])[0],
  );
}

function mockAuditRow(overrides: {
  id: string;
  action: string;
  entityId: string;
  timestamp?: Date;
  userRole?: PrivilegeLevel;
  userName?: string | null;
  afterValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}) {
  return {
    id: overrides.id,
    action: overrides.action,
    entityType: "CommitteeMembership",
    entityId: overrides.entityId,
    timestamp: overrides.timestamp ?? new Date("2025-06-01T12:00:00.000Z"),
    userRole: overrides.userRole ?? PrivilegeLevel.Admin,
    afterValue: overrides.afterValue ?? null,
    metadata: overrides.metadata ?? null,
    user: { name: overrides.userName ?? "Staff Member" },
  };
}

type AuditFindManyArgs = {
  where?: { action?: { in?: string[] } };
  take?: number;
  skip?: number;
  cursor?: { id: string };
};

/**
 * Serves `rows` like the database would: filtered by `where.action.in`,
 * ordered `timestamp desc, id desc`, then paged by `cursor` / `skip` / `take`.
 */
function serveAuditRows(rows: Array<ReturnType<typeof mockAuditRow>>) {
  const sorted = [...rows].sort(
    (a, b) =>
      b.timestamp.getTime() - a.timestamp.getTime() ||
      (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
  );
  getAuditLogMock(prismaMock).findMany.mockImplementation(
    (args: AuditFindManyArgs) => {
      const actions = args.where?.action?.in;
      const matching = actions
        ? sorted.filter((r) => actions.includes(r.action))
        : sorted;
      const start = args.cursor
        ? matching.findIndex((r) => r.id === args.cursor?.id) + (args.skip ?? 0)
        : (args.skip ?? 0);
      return Promise.resolve(
        matching.slice(start, start + (args.take ?? matching.length)),
      );
    },
  );
}

function adminSession() {
  mockAuthSession(
    createMockSession({
      user: { id: ADMIN_USER_ID, privilegeLevel: PrivilegeLevel.Admin },
    }),
  );
  mockHasPermission(true);
}

function leaderSession() {
  mockAuthSession(
    createMockSession({
      user: { id: LEADER_USER_ID, privilegeLevel: PrivilegeLevel.Leader },
    }),
  );
  mockHasPermission(true);
}

function leaderJurisdictions(
  jurisdictions: Array<{ cityTown: string; legDistrict: number | null }>,
) {
  getUserJurisdictionMock().findMany.mockResolvedValue(jurisdictions);
}

function detailRequest(): NextRequest {
  return createMockRequest({}, {}, { method: "GET" });
}

function routeContext(committeeListId: string) {
  return { params: Promise.resolve({ committeeListId }) };
}

async function getDetail(committeeListId = "1") {
  const response = await GET(detailRequest(), routeContext(committeeListId));
  expect(response.status).toBe(200);
  return parseJsonResponseWith(response, committeeDetailResponseSchema);
}

function eventsOfKind<K extends HistoryEvent["kind"]>(
  body: CommitteeDetailResponse,
  kind: K,
): Array<Extract<HistoryEvent, { kind: K }>> {
  return body.history.events.filter(
    (e): e is Extract<HistoryEvent, { kind: K }> => e.kind === kind,
  );
}

/** Keys as the JSON body carries them (Zod output keeps optional keys as undefined). */
function jsonKeys(value: unknown): string[] {
  const parsed: unknown = JSON.parse(JSON.stringify(value));
  return typeof parsed === "object" && parsed !== null
    ? Object.keys(parsed)
    : [];
}

const PII_STRINGS = [
  "leader@example.com",
  "585-555-0100",
  "585-555-0199",
  "Please seat her quickly",
  "Moved to Florida",
  "Executive session notes",
  "Committee already full",
  "Staff Member",
] as const;

/**
 * A committee with one active member (with contact), one pending replacement
 * request (with contact + notes), and one removed member — the fixture the
 * PII and pending tests share.
 */
function seedRichCommittee() {
  const active = mockMembership({
    id: "m-active",
    VRCNUM: "V-ACTIVE",
    seatNumber: 1,
    firstName: "Alice",
    lastName: "Active",
    email: "alice@example.com",
    telephone: "585-555-0100",
    submissionMetadata: { email: "leader@example.com" },
  });
  const removed = mockMembership({
    id: "m-removed",
    VRCNUM: "V-REMOVED",
    status: "REMOVED",
    firstName: "Rob",
    lastName: "Removed",
  });
  const pending = mockMembership({
    id: "m-pending",
    VRCNUM: "V-PENDING",
    status: "SUBMITTED",
    firstName: "Pat",
    lastName: "Pending",
    telephone: "585-555-0199",
    submittedById: LEADER_USER_ID,
    submittedByName: "Staff Member",
    submissionMetadata: {
      removeMemberId: "V-ACTIVE",
      requestNotes: "Please seat her quickly",
      eligibilityWarnings: [{ code: "INACTIVE_STATUS" }],
    },
  });
  const committee = mockCommittee({
    seats: [mockSeat({ seatNumber: 1 }), mockSeat({ seatNumber: 2 })],
    memberships: [active, removed, pending],
  });
  mockCommitteeWithMemberships(committee, [active, removed, pending]);
  return { active, removed, pending };
}

describe("GET /api/committee/[committeeListId]/detail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCommitteeListMock().findUnique.mockResolvedValue(null);
    getMembershipMock(prismaMock).findMany.mockResolvedValue([]);
    getAuditLogMock(prismaMock).findMany.mockResolvedValue([]);
    getMeetingRecordMock(prismaMock).findMany.mockResolvedValue([]);
    getUserJurisdictionMock().findMany.mockResolvedValue([]);
  });

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  describe("authentication and authorization", () => {
    const authSuite = createAuthTestSuite(
      {
        endpointName: "GET /api/committee/[committeeListId]/detail",
        requiredPrivilege: PrivilegeLevel.Leader,
        mockRequest: detailRequest,
      },
      (req) => GET(req, routeContext("1")),
      mockAuthSession,
      mockHasPermission,
      () => {
        mockCommitteeWithMemberships(mockCommittee({}), []);
        leaderJurisdictions([{ cityTown: "Test City", legDistrict: 1 }]);
      },
    );

    for (const { description, runTest } of authSuite) {
      it(description, runTest);
    }

    it("returns 401 before touching the database", async () => {
      mockAuthSession(null);
      const response = await GET(detailRequest(), routeContext("1"));
      expect(response.status).toBe(401);
      expect(getCommitteeListMock().findUnique).not.toHaveBeenCalled();
    });

    it.each([PrivilegeLevel.ReadAccess, PrivilegeLevel.RequestAccess])(
      "returns 403 for %s before touching the database",
      async (privilegeLevel) => {
        mockAuthSession(createMockSession({ user: { privilegeLevel } }));
        mockHasPermission(false);
        const response = await GET(detailRequest(), routeContext("1"));
        await expectErrorResponse(
          response,
          403,
          "User does not have sufficient privilege",
        );
        expect(getCommitteeListMock().findUnique).not.toHaveBeenCalled();
      },
    );
  });

  // -------------------------------------------------------------------------
  // Params
  // -------------------------------------------------------------------------
  describe("route params", () => {
    it.each(["abc", "0", "-1", "1.5", ""])(
      "returns 400 for committeeListId %j",
      async (id) => {
        adminSession();
        const response = await GET(detailRequest(), routeContext(id));
        expect(response.status).toBe(400);
        const body = await parseJsonResponse<{ error: string }>(response);
        expect(body.error).toContain(
          "committeeListId must be a positive integer",
        );
        expect(getCommitteeListMock().findUnique).not.toHaveBeenCalled();
      },
    );

    it("returns 400 when the route context is missing", async () => {
      adminSession();
      const response = await GET(detailRequest());
      expect(response.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // Scope
  // -------------------------------------------------------------------------
  describe("scope", () => {
    it("returns 404 for an unknown committeeListId", async () => {
      adminSession();
      const response = await GET(detailRequest(), routeContext("999"));
      await expectErrorResponse(response, 404, "Committee not found");
      expect(getCommitteeListMock().findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 999 } }),
      );
      expect(getMembershipMock(prismaMock).findMany).not.toHaveBeenCalled();
    });

    it("returns 404 for a committee outside the active term, even for Admin", async () => {
      adminSession();
      mockCommitteeWithMemberships(
        mockCommittee({ termId: "term-old-2022-2024" }),
        [],
      );
      const response = await GET(detailRequest(), routeContext("1"));
      await expectErrorResponse(response, 404, "Committee not found");
      expect(getMembershipMock(prismaMock).findMany).not.toHaveBeenCalled();
    });

    it("returns 403 for a Leader whose jurisdictions do not cover the committee", async () => {
      leaderSession();
      leaderJurisdictions([{ cityTown: "Greece", legDistrict: null }]);
      mockCommitteeWithMemberships(
        mockCommittee({ cityTown: "Webster", legDistrict: 4 }),
        [],
      );

      const response = await GET(detailRequest(), routeContext("1"));

      await expectErrorResponse(
        response,
        403,
        "You do not have access to this committee",
      );
      expect(getUserJurisdictionMock().findMany).toHaveBeenCalledWith({
        where: { userId: LEADER_USER_ID, termId: DEFAULT_ACTIVE_TERM_ID },
      });
      // Nothing beyond the committee row is read for a denied caller.
      expect(getMembershipMock(prismaMock).findMany).not.toHaveBeenCalled();
      expect(getAuditLogMock(prismaMock).findMany).not.toHaveBeenCalled();
    });

    it("returns 403 for a Leader whose jurisdiction is the right town but a different LD", async () => {
      leaderSession();
      leaderJurisdictions([{ cityTown: "ROCHESTER", legDistrict: 21 }]);
      mockCommitteeWithMemberships(
        mockCommittee({ cityTown: "ROCHESTER", legDistrict: 22 }),
        [],
      );
      const response = await GET(detailRequest(), routeContext("1"));
      expect(response.status).toBe(403);
    });

    it("returns 403 for a Leader with no jurisdictions", async () => {
      leaderSession();
      leaderJurisdictions([]);
      mockCommitteeWithMemberships(mockCommittee({}), []);
      const response = await GET(detailRequest(), routeContext("1"));
      expect(response.status).toBe(403);
    });

    it("succeeds for a Leader whose all-LD jurisdiction covers the committee", async () => {
      leaderSession();
      leaderJurisdictions([{ cityTown: "Test City", legDistrict: null }]);
      mockCommitteeWithMemberships(
        mockCommittee({ id: 7, legDistrict: 3, electionDistrict: 12 }),
        [],
      );

      const body = await getDetail("7");

      expect(body.committee).toEqual({
        committeeListId: 7,
        cityTown: "Test City",
        legDistrict: 3,
        electionDistrict: 12,
        termId: DEFAULT_ACTIVE_TERM_ID,
        ltedWeight: null,
      });
    });

    it("does not consult jurisdictions for Admin", async () => {
      adminSession();
      mockCommitteeWithMemberships(mockCommittee({}), []);
      await getDetail();
      expect(getUserJurisdictionMock().findMany).not.toHaveBeenCalled();
    });

    it("scopes memberships, pending, petition and history queries to the active term", async () => {
      adminSession();
      mockCommitteeWithMemberships(mockCommittee({}), []);
      await getDetail();

      expect(getCommitteeListMock().findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          memberships: {
            where: { status: "ACTIVE", termId: DEFAULT_ACTIVE_TERM_ID },
            include: { voterRecord: true },
          },
          seats: { orderBy: { seatNumber: "asc" } },
          term: true,
        },
      });
      for (const call of membershipFindManyCalls()) {
        expect(call.where).toMatchObject({
          committeeListId: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
        });
      }
    });
  });

  // -------------------------------------------------------------------------
  // Identity, rollup, rows, weight summary
  // -------------------------------------------------------------------------
  describe("summary", () => {
    it("returns identity, term, rollup, rows and weight summary for the committee", async () => {
      adminSession();
      const seated = mockMembership({
        id: "m-1",
        VRCNUM: "V-1",
        seatNumber: 2,
        membershipType: "PETITIONED",
      });
      const loose = mockMembership({
        id: "m-2",
        VRCNUM: "V-2",
        seatNumber: null,
      });
      const pending = mockMembership({
        id: "m-3",
        VRCNUM: "V-3",
        status: "SUBMITTED",
      });
      mockCommitteeWithMemberships(
        mockCommittee({
          ltedWeight: 1,
          seats: [
            mockSeat({ seatNumber: 1, isPetitioned: true, weight: null }),
            mockSeat({ seatNumber: 2, isPetitioned: true, weight: 0.25 }),
            mockSeat({ seatNumber: 3 }),
          ],
          memberships: [seated, loose, pending],
        }),
        [seated, loose, pending],
      );

      const body = await getDetail();

      expect(body.committee.ltedWeight).toBe("1");
      expect(body.term).toEqual({
        id: DEFAULT_ACTIVE_TERM_ID,
        label: "2024–2026",
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2026-12-31T00:00:00.000Z",
      });
      expect(body.maxSeatsPerLted).toBe(4);
      expect(body.rollup).toEqual({
        committeeListId: 1,
        cityTown: "Test City",
        legDistrict: 1,
        electionDistrict: 1,
        filled: 1,
        totalSeats: 3,
        unassignedCount: 1,
        pendingCount: 1,
        designationWeight: 0.25,
        missingWeightSeatNumbers: [1],
      });
      expect(body.rows.map((r) => r.seatNumber)).toEqual([1, 2, 3, null]);
      expect(body.rows[1]?.occupant?.VRCNUM).toBe("V-1");
      expect(body.rows[3]).toMatchObject({ unassigned: true });
      expect(body.designationWeightSummary).toMatchObject({
        totalWeight: 0.25,
        totalContributingSeats: 1,
        missingWeightSeatNumbers: [1],
      });
      expect(body.designationWeightSummary.seats).toHaveLength(3);
    });

    it("synthesizes maxSeatsPerLted vacant seats when the committee has no Seat rows", async () => {
      adminSession();
      mockCommitteeWithMemberships(mockCommittee({ seats: [] }), []);
      const body = await getDetail();
      expect(body.rollup.totalSeats).toBe(4);
      expect(body.rows).toHaveLength(4);
      expect(body.rows.every((r) => r.occupant === null)).toBe(true);
    });

    it("returns 409 when two active memberships claim the same seat", async () => {
      adminSession();
      const a = mockMembership({ id: "m-a", VRCNUM: "V-A", seatNumber: 1 });
      const b = mockMembership({ id: "m-b", VRCNUM: "V-B", seatNumber: 1 });
      mockCommitteeWithMemberships(
        mockCommittee({
          seats: [mockSeat({ seatNumber: 1 })],
          memberships: [a, b],
        }),
        [a, b],
      );
      const response = await GET(detailRequest(), routeContext("1"));
      expect(response.status).toBe(409);
      const body = await parseJsonResponse<{ error: string }>(response);
      expect(body.error).toMatch(/Data integrity error/);
    });

    it("returns 500 for unexpected errors", async () => {
      adminSession();
      getCommitteeListMock().findUnique.mockRejectedValue(
        new Error("DB connection lost"),
      );
      const response = await GET(detailRequest(), routeContext("1"));
      await expectErrorResponse(response, 500, "Internal server error");
    });
  });

  // -------------------------------------------------------------------------
  // Pending
  // -------------------------------------------------------------------------
  describe("pending memberships", () => {
    it("lists SUBMITTED memberships with replacement target for a Leader in jurisdiction", async () => {
      leaderSession();
      leaderJurisdictions([{ cityTown: "Test City", legDistrict: 1 }]);
      seedRichCommittee();

      const body = await getDetail();

      expect(body.pending).toEqual([
        {
          membershipId: "m-pending",
          voterRecordId: "V-PENDING",
          firstName: "Pat",
          lastName: "Pending",
          submittedAt: "2025-03-01T12:00:00.000Z",
          isOwnSubmission: true,
          replacementFor: {
            voterRecordId: "V-ACTIVE",
            firstName: "Alice",
            lastName: "Active",
          },
        },
      ]);
      expect(body.rollup.pendingCount).toBe(1);
      const pendingQuery = membershipFindManyCalls().find(
        (c) => c.where?.status === "SUBMITTED",
      );
      expect(pendingQuery?.where).toEqual({
        committeeListId: 1,
        termId: DEFAULT_ACTIVE_TERM_ID,
        status: "SUBMITTED",
      });
    });

    it("adds submitter, notes, warnings and contact for Admin", async () => {
      adminSession();
      seedRichCommittee();

      const body = await getDetail();

      expect(body.pending[0]).toMatchObject({
        isOwnSubmission: false,
        submittedBy: { id: LEADER_USER_ID, name: "Staff Member" },
        requestNotes: "Please seat her quickly",
        eligibilityWarnings: [{ code: "INACTIVE_STATUS" }],
        contact: { email: null, phone: "585-555-0199" },
      });
    });

    it("returns replacementFor null for a plain add", async () => {
      adminSession();
      const pending = mockMembership({
        id: "m-p",
        VRCNUM: "V-P",
        status: "SUBMITTED",
      });
      mockCommitteeWithMemberships(mockCommittee({ memberships: [pending] }), [
        pending,
      ]);
      const body = await getDetail();
      expect(body.pending[0]?.replacementFor).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // PII
  // -------------------------------------------------------------------------
  describe("PII gating", () => {
    it("serializes no contact, notes, warnings, actor names or voter ids in history for a Leader", async () => {
      leaderSession();
      leaderJurisdictions([{ cityTown: "Test City", legDistrict: 1 }]);
      const { active, removed, pending } = seedRichCommittee();
      getAuditLogMock(prismaMock).findMany.mockResolvedValue([
        mockAuditRow({
          id: "a-3",
          action: "MEMBER_SUBMITTED",
          entityId: pending.id,
          afterValue: { status: "SUBMITTED" },
          metadata: {
            subject: { memberName: "Pat Pending", voterRecordId: "V-PENDING" },
          },
        }),
        mockAuditRow({
          id: "a-2",
          action: "MEMBER_REMOVED",
          entityId: removed.id,
          afterValue: {
            status: "REMOVED",
            removalReason: "MOVED_OUT_OF_DISTRICT",
            removalNotes: "Moved to Florida",
          },
          metadata: { source: "manual" },
        }),
        mockAuditRow({
          id: "a-1",
          action: "MEMBER_REJECTED",
          entityId: active.id,
          afterValue: {
            status: "REJECTED",
            rejectionNote: "Committee already full",
            meetingRecordId: "meeting-1",
          },
          metadata: { reason: "capacity" },
        }),
      ]);
      getMeetingRecordMock(prismaMock).findMany.mockResolvedValue([
        {
          id: "meeting-1",
          meetingDate: new Date("2025-05-01T00:00:00.000Z"),
          meetingType: "EXECUTIVE_COMMITTEE",
          notes: "Executive session notes",
        },
      ]);

      const body = await getDetail();

      expect(body.rows[0]?.occupant?.VRCNUM).toBe("V-ACTIVE");
      expect(body.rows[0]?.contact).toBeUndefined();
      expect(body.petitionContext).toBeUndefined();
      expect(jsonKeys(body.pending[0])).not.toContain("contact");
      expect(jsonKeys(body.pending[0])).not.toContain("requestNotes");
      expect(jsonKeys(body.pending[0])).not.toContain("eligibilityWarnings");
      expect(jsonKeys(body.pending[0])).not.toContain("submittedBy");

      expect(body.history.events.map((e) => e.kind)).toEqual([
        "submitted",
        "removed",
        "rejected",
      ]);
      for (const event of body.history.events) {
        expect(event.actor).toEqual({ role: PrivilegeLevel.Admin });
        expect(jsonKeys(event.member)).not.toContain("voterRecordId");
      }
      const [rejected] = eventsOfKind(body, "rejected");
      expect(rejected?.meeting).toEqual({
        id: "meeting-1",
        meetingDate: "2025-05-01T00:00:00.000Z",
        meetingType: "EXECUTIVE_COMMITTEE",
      });
      expect(jsonKeys(rejected)).not.toContain("rejectionNote");
      expect(jsonKeys(rejected)).not.toContain("systemReason");
      const [removedEvent] = eventsOfKind(body, "removed");
      expect(jsonKeys(removedEvent)).not.toContain("reason");
      expect(jsonKeys(removedEvent)).not.toContain("notes");

      const serialized = JSON.stringify(body);
      for (const pii of PII_STRINGS) {
        expect(serialized).not.toContain(pii);
      }
      // The petition query is never issued for a Leader.
      expect(
        membershipFindManyCalls().some(
          (c) => c.where?.membershipType === "PETITIONED",
        ),
      ).toBe(false);
    });

    it("serializes no petition outcome, vote, or primary-date data for a Leader; a win shows as a plain activation", async () => {
      leaderSession();
      leaderJurisdictions([{ cityTown: "Test City", legDistrict: 1 }]);
      const winner = mockMembership({
        id: "m-won",
        VRCNUM: "V-WON",
        seatNumber: 2,
        membershipType: "PETITIONED",
        petitionSeatNumber: 2,
        petitionPrimaryDate: new Date("2024-06-25T00:00:00.000Z"),
        petitionVoteCount: 120,
        firstName: "Win",
        lastName: "Ner",
      });
      const loser = mockMembership({
        id: "m-lost",
        VRCNUM: "V-LOST",
        status: "PETITIONED_LOST",
        membershipType: "PETITIONED",
        petitionSeatNumber: 2,
        petitionPrimaryDate: new Date("2024-06-25T00:00:00.000Z"),
        petitionVoteCount: 47,
        firstName: "Lou",
        lastName: "Lost",
      });
      const tied = mockMembership({
        id: "m-tie",
        VRCNUM: "V-TIE",
        status: "PETITIONED_TIE",
        membershipType: "PETITIONED",
        firstName: "Tia",
        lastName: "Tie",
      });
      const all = [winner, loser, tied];
      mockCommitteeWithMemberships(
        mockCommittee({
          seats: [mockSeat({ seatNumber: 1 }), mockSeat({ seatNumber: 2 })],
          memberships: all,
        }),
        all,
      );
      const recorded = (
        id: string,
        entityId: string,
        outcome: string,
        status: string,
        voteCount: number,
        seatNumber: number | null,
      ) =>
        mockAuditRow({
          id,
          action: "PETITION_RECORDED",
          entityId,
          afterValue: { status, seatNumber },
          metadata: {
            source: "petition_outcome",
            outcome,
            seatNumber: 2,
            voteCount,
            resultingStatus: status,
          },
        });
      getAuditLogMock(prismaMock).findMany.mockResolvedValue([
        recorded("a-5", tied.id, "TIE", "PETITIONED_TIE", 33, null),
        recorded("a-4", loser.id, "LOST", "PETITIONED_LOST", 47, null),
        mockAuditRow({
          id: "a-3",
          action: "MEMBER_ACTIVATED",
          entityId: winner.id,
          afterValue: { status: "ACTIVE", seatNumber: 2 },
          metadata: {
            source: "petition_outcome",
            petitionSeatNumber: 2,
            petitionOutcome: "WON",
            petitionVoteCount: 120,
            subject: { memberName: "Win Ner", voterRecordId: "V-WON" },
          },
        }),
        recorded("a-2", winner.id, "WON", "ACTIVE", 120, 2),
        // Undo-compensated outcome: also petition data, also hidden.
        mockAuditRow({
          id: "a-1",
          action: "PETITION_RECORDED",
          entityId: loser.id,
          afterValue: { status: "PETITIONED_LOST", seatNumber: null },
          metadata: { source: "discrepancy_undo" },
        }),
      ]);

      const body = await getDetail();

      expect(body.history.events).toEqual([
        {
          id: "a-3",
          kind: "activated",
          at: "2025-06-01T12:00:00.000Z",
          actor: { role: PrivilegeLevel.Admin },
          member: { name: "Win Ner", seatNumber: 2 },
          source: "other",
        },
      ]);
      expect(body.petitionContext).toBeUndefined();

      const serialized = JSON.stringify(body);
      for (const forbidden of [
        "petition_outcome",
        "outcome",
        "voteCount",
        "VoteCount",
        "primaryDate",
        "PrimaryDate",
        "petitionContext",
        "reversed",
        // Outcome values as JSON strings (not substrings of names/ids).
        '"WON"',
        '"LOST"',
        '"TIE"',
        '"won"',
        '"lost"',
        '"tie"',
        "120",
        "47",
        "33",
        "2024-06-25",
      ]) {
        expect(serialized).not.toContain(forbidden);
      }
    });

    it("includes contact (submissionMetadata first), petition context and Admin-only history fields for Admin", async () => {
      adminSession();
      const { active, removed } = seedRichCommittee();
      const winner = mockMembership({
        id: "m-won",
        VRCNUM: "V-WON",
        seatNumber: 2,
        membershipType: "PETITIONED",
        petitionSeatNumber: 2,
        petitionPrimaryDate: new Date("2024-06-25T00:00:00.000Z"),
        petitionVoteCount: 120,
      });
      mockCommitteeWithMemberships(
        mockCommittee({
          seats: [mockSeat({ seatNumber: 1 }), mockSeat({ seatNumber: 2 })],
          memberships: [active, removed, winner],
        }),
        [active, removed, winner],
      );
      getAuditLogMock(prismaMock).findMany.mockResolvedValue([
        mockAuditRow({
          id: "a-1",
          action: "MEMBER_REMOVED",
          entityId: removed.id,
          userName: "Staff Member",
          afterValue: {
            status: "REMOVED",
            removalReason: "MOVED_OUT_OF_DISTRICT",
            removalNotes: "Moved to Florida",
          },
          metadata: {
            source: "manual",
            subject: {
              memberName: "Rob Removed",
              voterRecordId: "V-REMOVED",
              seatNumber: 2,
            },
          },
        }),
      ]);

      const body = await getDetail();

      expect(body.rows[0]?.contact).toEqual({
        email: "leader@example.com",
        phone: "585-555-0100",
      });
      expect(body.petitionContext).toEqual([
        {
          id: "m-won",
          voterRecordId: "V-WON",
          voter: { VRCNUM: "V-WON", firstName: "Jane", lastName: "Doe" },
          seatNumber: 2,
          petitionSeatNumber: 2,
          status: "ACTIVE",
          petitionPrimaryDate: "2024-06-25T00:00:00.000Z",
          petitionVoteCount: 120,
        },
      ]);
      const petitionQuery = membershipFindManyCalls().find(
        (c) => c.where?.membershipType === "PETITIONED",
      );
      expect(petitionQuery?.where).toEqual({
        membershipType: "PETITIONED",
        petitionSeatNumber: { not: null },
        termId: DEFAULT_ACTIVE_TERM_ID,
        committeeListId: 1,
      });

      const [removedEvent] = eventsOfKind(body, "removed");
      expect(removedEvent).toEqual({
        id: "a-1",
        kind: "removed",
        at: "2025-06-01T12:00:00.000Z",
        actor: { role: PrivilegeLevel.Admin, name: "Staff Member" },
        member: {
          name: "Rob Removed",
          seatNumber: 2,
          voterRecordId: "V-REMOVED",
        },
        source: "manual",
        reason: "MOVED_OUT_OF_DISTRICT",
        notes: "Moved to Florida",
      });
    });
  });

  // -------------------------------------------------------------------------
  // History
  // -------------------------------------------------------------------------
  describe("history", () => {
    const member = (
      id: string,
      VRCNUM: string,
      seatNumber: number | null = null,
    ) =>
      mockMembership({
        id,
        VRCNUM,
        seatNumber,
        firstName: "Cur",
        lastName: "Rent",
      });

    it("queries audit rows by entityType + membership ids, newest first, limit + 1", async () => {
      adminSession();
      const a = member("m-a", "V-A");
      const b = member("m-b", "V-B");
      mockCommitteeWithMemberships(mockCommittee({ memberships: [a, b] }), [
        a,
        b,
      ]);

      await getDetail();

      expect(getAuditLogMock(prismaMock).findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            entityType: "CommitteeMembership",
            entityId: { in: ["m-a", "m-b"] },
            action: {
              in: [
                "MEMBER_SUBMITTED",
                "MEMBER_REJECTED",
                "MEMBER_CONFIRMED",
                "MEMBER_ACTIVATED",
                "MEMBER_RESIGNED",
                "MEMBER_REMOVED",
                "PETITION_RECORDED",
              ],
            },
          },
          orderBy: [{ timestamp: "desc" }, { id: "desc" }],
          take: COMMITTEE_DETAIL_HISTORY_LIMIT + 1,
        }),
      );
    });

    it("leaves PETITION_RECORDED out of a Leader's audit query", async () => {
      leaderSession();
      leaderJurisdictions([{ cityTown: "Test City", legDistrict: null }]);
      const a = member("m-a", "V-A");
      mockCommitteeWithMemberships(mockCommittee({ memberships: [a] }), [a]);

      await getDetail();

      const [args] = getAuditLogMock(prismaMock).findMany.mock.calls[0] as [
        AuditFindManyArgs,
      ];
      expect(args.where?.action?.in).not.toContain("PETITION_RECORDED");
      expect(args.where?.action?.in).toContain("MEMBER_ACTIVATED");
    });

    it("skips the audit query and returns an empty history when the committee has no memberships", async () => {
      adminSession();
      mockCommitteeWithMemberships(mockCommittee({}), []);
      const body = await getDetail();
      expect(body.history).toEqual({ events: [], hasMore: false });
      expect(getAuditLogMock(prismaMock).findMany).not.toHaveBeenCalled();
    });

    it("assembles submission, confirmation (collapsing ACTIVATED), resignation, removal and petition outcome", async () => {
      adminSession();
      const incoming = member("m-in", "V-IN", 1);
      const outgoing = mockMembership({
        id: "m-out",
        VRCNUM: "V-OUT",
        status: "REMOVED",
        firstName: "Olive",
        lastName: "Out",
        submissionMetadata: null,
      });
      const resigned = mockMembership({
        id: "m-res",
        VRCNUM: "V-RES",
        status: "RESIGNED",
        firstName: "Ray",
        lastName: "Resigned",
      });
      const loser = mockMembership({
        id: "m-lost",
        VRCNUM: "V-LOST",
        status: "PETITIONED_LOST",
        membershipType: "PETITIONED",
        petitionSeatNumber: 3,
        petitionPrimaryDate: new Date("2024-06-25T00:00:00.000Z"),
        firstName: "Lou",
        lastName: "Lost",
      });
      incoming.submissionMetadata = {
        removeMemberId: "V-OUT",
        requestNotes: "Replacement please",
      };
      const all = [incoming, outgoing, resigned, loser];
      mockCommitteeWithMemberships(
        mockCommittee({
          seats: [1, 2, 3].map((seatNumber) => mockSeat({ seatNumber })),
          memberships: all,
        }),
        all,
      );
      const t = (iso: string) => new Date(iso);
      getAuditLogMock(prismaMock).findMany.mockResolvedValue([
        mockAuditRow({
          id: "a-7",
          action: "PETITION_RECORDED",
          entityId: loser.id,
          timestamp: t("2025-07-01T00:00:00.000Z"),
          afterValue: { status: "PETITIONED_LOST", seatNumber: null },
          metadata: {
            source: "petition_outcome",
            outcome: "LOST",
            seatNumber: 3,
            primaryDate: "2024-06-25T00:00:00.000Z",
            voteCount: 40,
            subject: { memberName: "Lou Lost", voterRecordId: "V-LOST" },
          },
        }),
        mockAuditRow({
          id: "a-6",
          action: "MEMBER_ACTIVATED",
          entityId: loser.id,
          timestamp: t("2025-07-01T00:00:00.000Z"),
          afterValue: { status: "ACTIVE", seatNumber: 3 },
          metadata: { source: "petition_outcome" },
        }),
        mockAuditRow({
          id: "a-5",
          action: "MEMBER_RESIGNED",
          entityId: resigned.id,
          timestamp: t("2025-06-15T00:00:00.000Z"),
          afterValue: {
            status: "RESIGNED",
            resignationDateReceived: "2025-06-10",
            resignationMethod: "EMAIL",
            resignationReason: "OTHER",
            removalReason: "OTHER",
            removalNotes: "Family reasons",
          },
          metadata: {
            subject: { memberName: "Ray Resigned", voterRecordId: "V-RES" },
          },
        }),
        mockAuditRow({
          id: "a-4",
          action: "MEMBER_ACTIVATED",
          entityId: incoming.id,
          timestamp: t("2025-06-01T00:00:00.000Z"),
          afterValue: {
            status: "ACTIVE",
            membershipType: "APPOINTED",
            seatNumber: 1,
            meetingRecordId: "meeting-1",
          },
          metadata: {
            meetingRecordId: "meeting-1",
            subject: {
              memberName: "Ivy In",
              voterRecordId: "V-IN",
              seatNumber: 1,
            },
          },
        }),
        mockAuditRow({
          id: "a-3",
          action: "MEMBER_CONFIRMED",
          entityId: incoming.id,
          timestamp: t("2025-06-01T00:00:00.000Z"),
          afterValue: {
            status: "CONFIRMED",
            membershipType: "APPOINTED",
            seatNumber: 1,
            meetingRecordId: "meeting-1",
          },
          metadata: {
            meetingRecordId: "meeting-1",
            subject: {
              memberName: "Ivy In",
              voterRecordId: "V-IN",
              seatNumber: 1,
            },
          },
        }),
        mockAuditRow({
          id: "a-2",
          action: "MEMBER_REMOVED",
          entityId: outgoing.id,
          timestamp: t("2025-06-01T00:00:00.000Z"),
          afterValue: { status: "REMOVED", removalReason: "OTHER" },
          metadata: {
            reason: "replacement",
            replacementMembershipId: incoming.id,
            subject: {
              memberName: "Olive Out",
              voterRecordId: "V-OUT",
              seatNumber: 1,
            },
          },
        }),
        mockAuditRow({
          id: "a-1",
          action: "MEMBER_SUBMITTED",
          entityId: incoming.id,
          timestamp: t("2025-05-01T00:00:00.000Z"),
          userRole: PrivilegeLevel.Leader,
          userName: "Lee Leader",
          afterValue: { status: "SUBMITTED" },
          // Pre-2026-06-20 row: no metadata.subject — name comes from the current row.
          metadata: null,
        }),
      ]);
      getMeetingRecordMock(prismaMock).findMany.mockResolvedValue([
        {
          id: "meeting-1",
          meetingDate: new Date("2025-06-01T00:00:00.000Z"),
          meetingType: "EXECUTIVE_COMMITTEE",
          notes: null,
        },
      ]);

      const body = await getDetail();

      expect(body.history.hasMore).toBe(false);
      expect(body.history.events.map((e) => [e.id, e.kind])).toEqual([
        ["a-7", "petition_outcome"],
        ["a-5", "resigned"],
        ["a-3", "confirmed"],
        ["a-2", "removed"],
        ["a-1", "submitted"],
      ]);
      expect(getMeetingRecordMock(prismaMock).findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ["meeting-1"] } } }),
      );

      const [petition] = eventsOfKind(body, "petition_outcome");
      expect(petition).toMatchObject({
        outcome: "lost",
        seatNumber: 3,
        primaryDate: "2024-06-25T00:00:00.000Z",
        voteCount: 40,
        source: "petition_outcome",
        member: { name: "Lou Lost", voterRecordId: "V-LOST" },
      });
      expect(jsonKeys(petition)).not.toContain("reversed");

      const [resignedEvent] = eventsOfKind(body, "resigned");
      expect(resignedEvent).toMatchObject({
        effectiveDate: "2025-06-10",
        method: "EMAIL",
        reason: "OTHER",
        notes: "Family reasons",
        source: "manual",
      });

      const [confirmed] = eventsOfKind(body, "confirmed");
      expect(confirmed).toMatchObject({
        membershipType: "APPOINTED",
        source: "meeting",
        member: { name: "Ivy In", seatNumber: 1 },
        meeting: {
          id: "meeting-1",
          meetingDate: "2025-06-01T00:00:00.000Z",
          meetingType: "EXECUTIVE_COMMITTEE",
          notes: null,
        },
      });

      const [removedEvent] = eventsOfKind(body, "removed");
      expect(removedEvent).toMatchObject({
        reason: "OTHER",
        member: { name: "Olive Out", seatNumber: 1 },
        // Linked members resolve from the current row, not the audit subject.
        replacedBy: { name: "Cur Rent", seatNumber: 1, voterRecordId: "V-IN" },
      });

      const [submitted] = eventsOfKind(body, "submitted");
      expect(submitted).toMatchObject({
        actor: { role: PrivilegeLevel.Leader, name: "Lee Leader" },
        member: { name: "Cur Rent", seatNumber: null, voterRecordId: "V-IN" },
        requestNotes: "Replacement please",
        replacementFor: { name: "Olive Out", voterRecordId: "V-OUT" },
      });
    });

    it("emits a standalone activated event for a direct Admin add and flags bulk-import removals", async () => {
      adminSession();
      const a = member("m-a", "V-A", 1);
      mockCommitteeWithMemberships(mockCommittee({ memberships: [a] }), [a]);
      getAuditLogMock(prismaMock).findMany.mockResolvedValue([
        mockAuditRow({
          id: "a-2",
          action: "MEMBER_REMOVED",
          entityId: a.id,
          afterValue: { status: "REMOVED", removalReason: "OTHER" },
          metadata: {
            source: "bulk_import_sync",
            reason: "not_in_import_file",
          },
        }),
        mockAuditRow({
          id: "a-1",
          action: "MEMBER_ACTIVATED",
          entityId: a.id,
          afterValue: { status: "ACTIVE", seatNumber: 1 },
          metadata: {
            overrideReason: "Chair approved",
            bypassedReasons: ["PARTY_MISMATCH"],
          },
        }),
      ]);

      const body = await getDetail();

      expect(body.history.events.map((e) => [e.kind, e.source])).toEqual([
        ["removed", "bulk_import_sync"],
        ["activated", "manual"],
      ]);
      const [activated] = eventsOfKind(body, "activated");
      expect(activated).toMatchObject({ overrideReason: "Chair approved" });
    });

    it("marks an undo-compensated petition outcome as reversed and derives the outcome from status", async () => {
      adminSession();
      const a = member("m-a", "V-A");
      mockCommitteeWithMemberships(mockCommittee({ memberships: [a] }), [a]);
      getAuditLogMock(prismaMock).findMany.mockResolvedValue([
        mockAuditRow({
          id: "a-1",
          action: "PETITION_RECORDED",
          entityId: a.id,
          afterValue: { status: "PETITIONED_TIE", seatNumber: null },
          metadata: { source: "discrepancy_undo" },
        }),
      ]);

      const body = await getDetail();

      const [petition] = eventsOfKind(body, "petition_outcome");
      expect(petition).toMatchObject({
        outcome: "tie",
        reversed: true,
        source: "discrepancy_undo",
      });
    });

    describe("petition outcome reads only its own audit row", () => {
      /** Re-added after an earlier cycle: the row now holds the 2026 petition. */
      const readded = () =>
        mockMembership({
          id: "m-re",
          VRCNUM: "V-RE",
          status: "ACTIVE",
          membershipType: "PETITIONED",
          seatNumber: 4,
          petitionSeatNumber: 4,
          petitionPrimaryDate: new Date("2026-06-23T00:00:00.000Z"),
          firstName: "Rhea",
          lastName: "Added",
        });

      it("shows the earlier cycle's primary date and seat from the event's metadata", async () => {
        adminSession();
        const m = readded();
        mockCommitteeWithMemberships(mockCommittee({ memberships: [m] }), [m]);
        getAuditLogMock(prismaMock).findMany.mockResolvedValue([
          mockAuditRow({
            id: "a-old",
            action: "PETITION_RECORDED",
            entityId: m.id,
            timestamp: new Date("2024-06-30T00:00:00.000Z"),
            afterValue: { status: "PETITIONED_LOST", seatNumber: null },
            metadata: {
              source: "petition_outcome",
              outcome: "LOST",
              seatNumber: 2,
              primaryDate: "2024-06-25T00:00:00.000Z",
              voteCount: 12,
            },
          }),
        ]);

        const body = await getDetail();

        const [petition] = eventsOfKind(body, "petition_outcome");
        expect(petition).toMatchObject({
          outcome: "lost",
          seatNumber: 2,
          primaryDate: "2024-06-25T00:00:00.000Z",
        });
      });

      it("omits primary date and seat the audit row did not record, never using the membership row", async () => {
        adminSession();
        const m = readded();
        mockCommitteeWithMemberships(mockCommittee({ memberships: [m] }), [m]);
        getAuditLogMock(prismaMock).findMany.mockResolvedValue([
          mockAuditRow({
            id: "a-old",
            action: "PETITION_RECORDED",
            entityId: m.id,
            timestamp: new Date("2024-06-30T00:00:00.000Z"),
            afterValue: { status: "PETITIONED_LOST", seatNumber: null },
            metadata: { source: "petition_outcome", outcome: "LOST" },
          }),
        ]);

        const body = await getDetail();

        const [petition] = eventsOfKind(body, "petition_outcome");
        expect(petition).toMatchObject({
          outcome: "lost",
          seatNumber: null,
          primaryDate: null,
        });
      });

      it("drops a primary date that is not a valid date rather than guessing", async () => {
        adminSession();
        const m = readded();
        mockCommitteeWithMemberships(mockCommittee({ memberships: [m] }), [m]);
        getAuditLogMock(prismaMock).findMany.mockResolvedValue([
          mockAuditRow({
            id: "a-old",
            action: "PETITION_RECORDED",
            entityId: m.id,
            afterValue: { status: "PETITIONED_LOST", seatNumber: null },
            metadata: {
              source: "petition_outcome",
              outcome: "LOST",
              primaryDate: "not a date",
            },
          }),
        ]);

        const body = await getDetail();

        const [petition] = eventsOfKind(body, "petition_outcome");
        expect(petition?.primaryDate).toBeNull();
      });
    });

    it("sets hasMore and truncates to the limit when more rows exist", async () => {
      adminSession();
      const a = member("m-a", "V-A");
      mockCommitteeWithMemberships(mockCommittee({ memberships: [a] }), [a]);
      getAuditLogMock(prismaMock).findMany.mockResolvedValue(
        Array.from({ length: COMMITTEE_DETAIL_HISTORY_LIMIT + 1 }, (_, i) =>
          mockAuditRow({
            id: `a-${String(i)}`,
            action: "MEMBER_ACTIVATED",
            entityId: a.id,
            afterValue: { status: "ACTIVE", seatNumber: 1 },
          }),
        ),
      );

      const body = await getDetail();

      expect(body.history.hasMore).toBe(true);
      expect(body.history.events).toHaveLength(COMMITTEE_DETAIL_HISTORY_LIMIT);
    });

    describe("limit counts events, not audit rows", () => {
      const at = (minutesAgo: number) =>
        new Date(Date.UTC(2025, 6, 1, 12, 0) - minutesAgo * 60_000);
      const pad = (n: number) => String(n).padStart(3, "0");

      /** A plain Admin add: one ACTIVATED row, one event. */
      const activation = (n: number, entityId: string) =>
        mockAuditRow({
          id: `act-${pad(n)}`,
          action: "MEMBER_ACTIVATED",
          entityId,
          timestamp: at(n),
          afterValue: { status: "ACTIVE", seatNumber: 1 },
        });

      /** An accept: CONFIRMED + ACTIVATED at one timestamp, one event. */
      const accept = (n: number, entityId: string) => {
        const meeting = { meetingRecordId: "meeting-1" };
        return [
          mockAuditRow({
            id: `acc-${pad(n)}-a`,
            action: "MEMBER_CONFIRMED",
            entityId,
            timestamp: at(n),
            afterValue: { status: "CONFIRMED", seatNumber: 1, ...meeting },
            metadata: meeting,
          }),
          mockAuditRow({
            id: `acc-${pad(n)}-b`,
            action: "MEMBER_ACTIVATED",
            entityId,
            timestamp: at(n),
            afterValue: { status: "ACTIVE", seatNumber: 1, ...meeting },
            metadata: meeting,
          }),
        ];
      };

      const petition = (n: number, entityId: string) =>
        mockAuditRow({
          id: `pet-${pad(n)}`,
          action: "PETITION_RECORDED",
          entityId,
          timestamp: at(n),
          afterValue: { status: "PETITIONED_LOST", seatNumber: null },
          metadata: { source: "petition_outcome", outcome: "LOST" },
        });

      it("gives a Leader every non-petition event when petition rows fill the newest rows", async () => {
        leaderSession();
        leaderJurisdictions([{ cityTown: "Test City", legDistrict: null }]);
        const a = member("m-a", "V-A", 1);
        mockCommitteeWithMemberships(mockCommittee({ memberships: [a] }), [a]);
        serveAuditRows([
          ...Array.from({ length: 55 }, (_, i) => petition(i, a.id)),
          ...Array.from({ length: 5 }, (_, i) => activation(100 + i, a.id)),
        ]);

        const body = await getDetail();

        expect(body.history.events.map((e) => e.kind)).toEqual(
          Array(5).fill("activated"),
        );
        expect(body.history.hasMore).toBe(false);
      });

      it("fills a Leader's page to the limit past petition rows and reports more", async () => {
        leaderSession();
        leaderJurisdictions([{ cityTown: "Test City", legDistrict: null }]);
        const a = member("m-a", "V-A", 1);
        mockCommitteeWithMemberships(mockCommittee({ memberships: [a] }), [a]);
        serveAuditRows([
          ...Array.from({ length: 55 }, (_, i) => petition(i, a.id)),
          ...Array.from({ length: 60 }, (_, i) => activation(100 + i, a.id)),
        ]);

        const body = await getDetail();

        expect(body.history.events).toHaveLength(
          COMMITTEE_DETAIL_HISTORY_LIMIT,
        );
        expect(body.history.events[0]?.id).toBe("act-100");
        expect(body.history.hasMore).toBe(true);
      });

      it("counts an Admin accept pair as one event toward the limit", async () => {
        adminSession();
        const a = member("m-a", "V-A", 1);
        mockCommitteeWithMemberships(mockCommittee({ memberships: [a] }), [a]);
        serveAuditRows(
          Array.from({ length: 30 }, (_, i) => accept(i, a.id)).flat(),
        );

        const body = await getDetail();

        expect(body.history.events).toHaveLength(30);
        expect(new Set(body.history.events.map((e) => e.kind))).toEqual(
          new Set(["confirmed"]),
        );
        expect(body.history.hasMore).toBe(false);
      });

      it("returns exactly the limit of accept events and reports more when they continue", async () => {
        adminSession();
        const a = member("m-a", "V-A", 1);
        mockCommitteeWithMemberships(mockCommittee({ memberships: [a] }), [a]);
        serveAuditRows(
          Array.from({ length: 60 }, (_, i) => accept(i, a.id)).flat(),
        );

        const body = await getDetail();

        const ids = body.history.events.map((e) => e.id);
        expect(ids).toHaveLength(COMMITTEE_DETAIL_HISTORY_LIMIT);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids[0]).toBe("acc-000-a");
        expect(ids.at(-1)).toBe(
          `acc-${pad(COMMITTEE_DETAIL_HISTORY_LIMIT - 1)}-a`,
        );
        expect(body.history.hasMore).toBe(true);
      });

      it("reports no more when only event-less rows remain past the limit", async () => {
        adminSession();
        const a = member("m-a", "V-A", 1);
        mockCommitteeWithMemberships(mockCommittee({ memberships: [a] }), [a]);
        // 50 events, then one accept's ACTIVATED half alone (no event of its own).
        const [, orphanActivated] = accept(999, a.id);
        serveAuditRows([
          ...Array.from({ length: COMMITTEE_DETAIL_HISTORY_LIMIT }, (_, i) =>
            activation(i, a.id),
          ),
          ...(orphanActivated ? [orphanActivated] : []),
        ]);

        const body = await getDetail();

        expect(body.history.events).toHaveLength(
          COMMITTEE_DETAIL_HISTORY_LIMIT,
        );
        expect(body.history.hasMore).toBe(false);
      });
    });
  });
});
