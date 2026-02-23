/**
 * SRS 2.4 — API tests for Meeting Record + Bulk Decision workflow.
 */

import {
  POST as createMeeting,
  GET as listMeetings,
} from "~/app/api/admin/meetings/route";
import { GET as getSubmissions } from "~/app/api/admin/meetings/[meetingId]/submissions/route";
import { POST as bulkDecisions } from "~/app/api/admin/meetings/[meetingId]/decisions/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockRequest,
  createMockGovernanceConfig,
  createMockMembership,
  expectErrorResponse,
  expectAuditLogCreate,
  expectAnyDate,
  getMembershipMock,
  getAuditLogMock,
  getMeetingRecordMock,
  setupEligibilityPass,
} from "../../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../../utils/mocks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MEETING_ID = "meeting-test-001";

function createMockMeetingRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: MEETING_ID,
    meetingDate: new Date("2024-06-15"),
    meetingType: "EXECUTIVE_COMMITTEE",
    notes: "Test meeting notes",
    createdById: "test-user-id",
    createdAt: new Date("2024-06-15T10:00:00Z"),
    ...overrides,
  };
}

function routeContext(meetingId: string) {
  return { params: Promise.resolve({ meetingId }) };
}

// ---------------------------------------------------------------------------
// POST /api/admin/meetings — Create Meeting
// ---------------------------------------------------------------------------

describe("POST /api/admin/meetings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
    getMeetingRecordMock(prismaMock).create.mockResolvedValue(
      createMockMeetingRecord(),
    );
    getAuditLogMock(prismaMock).create.mockResolvedValue({});
  });

  it("creates a meeting and returns 201", async () => {
    const body = {
      meetingDate: "2024-06-15",
      meetingType: "EXECUTIVE_COMMITTEE",
      notes: "Test meeting",
    };
    const response = await createMeeting(createMockRequest(body));
    expect(response.status).toBe(201);

    const json = (await response.json()) as { meeting: { id: string } };
    expect(json.meeting.id).toBe(MEETING_ID);

    expect(getMeetingRecordMock(prismaMock).create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          meetingType: "EXECUTIVE_COMMITTEE",
          createdById: "test-user-id",
        }) as unknown,
      }) as unknown,
    );
  });

  it("logs MEETING_CREATED audit event", async () => {
    const body = { meetingDate: "2024-06-15" };
    await createMeeting(createMockRequest(body));

    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({ action: "MEETING_CREATED" }),
    );
  });

  it("returns 422 on invalid payload (missing date)", async () => {
    const body = { notes: "No date" };
    const response = await createMeeting(createMockRequest(body));
    await expectErrorResponse(response, 422, "Invalid request data");
  });

  it("returns 422 on invalid meeting date string", async () => {
    const body = { meetingDate: "not-a-date" };
    const response = await createMeeting(createMockRequest(body));
    await expectErrorResponse(response, 422, "Invalid request data");
  });

  it("returns 401 when not authenticated", async () => {
    mockAuthSession(null);
    const body = { meetingDate: "2024-06-15" };
    const response = await createMeeting(createMockRequest(body));
    await expectErrorResponse(response, 401, "Please log in");
  });

  it("returns 403 when non-admin", async () => {
    mockAuthSession(
      createMockSession({
        user: { privilegeLevel: PrivilegeLevel.ReadAccess },
      }),
    );
    mockHasPermission(false);
    const body = { meetingDate: "2024-06-15" };
    const response = await createMeeting(createMockRequest(body));
    await expectErrorResponse(
      response,
      403,
      "User does not have sufficient privilege",
    );
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/meetings — List Meetings
// ---------------------------------------------------------------------------

describe("GET /api/admin/meetings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
  });

  it("returns paginated meetings with counts", async () => {
    const mockMeeting = {
      ...createMockMeetingRecord(),
      _count: { memberships: 3 },
      createdBy: { name: "Admin", email: "admin@test.com" },
    };
    getMeetingRecordMock(prismaMock).findMany.mockResolvedValue([mockMeeting]);
    getMeetingRecordMock(prismaMock).count.mockResolvedValue(1);

    const req = createMockRequest({}, {}, { method: "GET" });
    const response = await listMeetings(req);
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      meetings: Array<{ id: string; membershipCount: number }>;
      total: number;
    };
    expect(json.meetings).toHaveLength(1);
    expect(json.meetings[0].id).toBe(MEETING_ID);
    expect(json.meetings[0].membershipCount).toBe(3);
    expect(json.total).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/meetings/[meetingId]/submissions
// ---------------------------------------------------------------------------

describe("GET /api/admin/meetings/[meetingId]/submissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
    getMeetingRecordMock(prismaMock).findUnique.mockResolvedValue(
      createMockMeetingRecord(),
    );
  });

  it("returns SUBMITTED memberships for the active term", async () => {
    const mockSubmission = {
      ...createMockMembership({ status: "SUBMITTED" }),
      voterRecord: {
        VRCNUM: "TEST123456",
        firstName: "John",
        lastName: "Doe",
        middleInitial: null,
        suffixName: null,
      },
      committeeList: {
        id: 1,
        cityTown: "Test City",
        legDistrict: 1,
        electionDistrict: 1,
      },
    };
    getMembershipMock(prismaMock).findMany.mockResolvedValue([mockSubmission]);

    const req = createMockRequest({}, {}, { method: "GET" });
    const response = await getSubmissions(req, routeContext(MEETING_ID));
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      submissions: Array<{ id: string; voterRecordId: string }>;
    };
    expect(json.submissions).toHaveLength(1);
    expect(json.submissions[0].voterRecordId).toBe("TEST123456");
  });

  it("returns 404 for non-existent meeting", async () => {
    getMeetingRecordMock(prismaMock).findUnique.mockResolvedValue(null);

    const req = createMockRequest({}, {}, { method: "GET" });
    const response = await getSubmissions(req, routeContext("bad-id"));
    await expectErrorResponse(response, 404, "Meeting not found");
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/meetings/[meetingId]/decisions — Bulk Decisions
// ---------------------------------------------------------------------------

describe("POST /api/admin/meetings/[meetingId]/decisions", () => {
  const MEMBERSHIP_ID = "membership-test-id-001";

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
    getMeetingRecordMock(prismaMock).findUnique.mockResolvedValue(
      createMockMeetingRecord(),
    );
    setupEligibilityPass(prismaMock);
    prismaMock.committeeGovernanceConfig.findFirst.mockResolvedValue(
      createMockGovernanceConfig({ maxSeatsPerLted: 4 }),
    );
    getMembershipMock(prismaMock).findUnique.mockResolvedValue(
      createMockMembership({ id: MEMBERSHIP_ID, status: "SUBMITTED" }),
    );
    getMembershipMock(prismaMock).update.mockResolvedValue({});
    getMembershipMock(prismaMock).findMany.mockResolvedValue([]);
    getAuditLogMock(prismaMock).create.mockResolvedValue({});
  });

  it("confirms a membership: sets ACTIVE, assigns seat, logs audit events", async () => {
    const body = {
      decisions: [{ membershipId: MEMBERSHIP_ID, decision: "confirm" }],
    };
    const response = await bulkDecisions(
      createMockRequest(body),
      routeContext(MEETING_ID),
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      results: Array<{
        membershipId: string;
        decision: string;
        success: boolean;
      }>;
    };
    expect(json.results).toHaveLength(1);
    expect(json.results[0].success).toBe(true);
    expect(json.results[0].decision).toBe("confirm");

    // Verify membership update
    expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MEMBERSHIP_ID },
        data: expect.objectContaining({
          status: "ACTIVE",
          confirmedAt: expectAnyDate(),
          activatedAt: expectAnyDate(),
          meetingRecordId: MEETING_ID,
          membershipType: "APPOINTED",
        }) as unknown,
      }) as unknown,
    );

    // Verify audit events: MEMBER_CONFIRMED + MEMBER_ACTIVATED
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({ action: "MEMBER_CONFIRMED" }),
    );
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({ action: "MEMBER_ACTIVATED" }),
    );
  });

  it("rejects a membership: sets REJECTED with rejectionNote", async () => {
    const body = {
      decisions: [
        {
          membershipId: MEMBERSHIP_ID,
          decision: "reject",
          rejectionNote: "Not eligible",
        },
      ],
    };
    const response = await bulkDecisions(
      createMockRequest(body),
      routeContext(MEETING_ID),
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      results: Array<{
        membershipId: string;
        decision: string;
        success: boolean;
      }>;
    };
    expect(json.results[0].success).toBe(true);
    expect(json.results[0].decision).toBe("reject");

    expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MEMBERSHIP_ID },
        data: expect.objectContaining({
          status: "REJECTED",
          rejectionNote: "Not eligible",
          meetingRecordId: MEETING_ID,
        }) as unknown,
      }) as unknown,
    );

    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({ action: "MEMBER_REJECTED" }),
    );
  });

  it("returns error for non-SUBMITTED membership (422-level)", async () => {
    getMembershipMock(prismaMock).findUnique.mockResolvedValue(
      createMockMembership({ id: MEMBERSHIP_ID, status: "ACTIVE" }),
    );

    const body = {
      decisions: [{ membershipId: MEMBERSHIP_ID, decision: "confirm" }],
    };
    const response = await bulkDecisions(
      createMockRequest(body),
      routeContext(MEETING_ID),
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      results: Array<{ success: boolean; error?: string }>;
    };
    expect(json.results[0].success).toBe(false);
    expect(json.results[0].error).toContain("ACTIVE");
    expect(json.results[0].error).toContain("expected SUBMITTED");
  });

  it("returns capacity error when all seats occupied", async () => {
    // Make assignNextAvailableSeat throw (all seats occupied)
    getMembershipMock(prismaMock).findMany.mockResolvedValue([
      { seatNumber: 1 },
      { seatNumber: 2 },
      { seatNumber: 3 },
      { seatNumber: 4 },
    ]);

    const body = {
      decisions: [{ membershipId: MEMBERSHIP_ID, decision: "confirm" }],
    };
    const response = await bulkDecisions(
      createMockRequest(body),
      routeContext(MEETING_ID),
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      results: Array<{ success: boolean; error?: string }>;
    };
    expect(json.results[0].success).toBe(false);
    expect(json.results[0].error).toContain("capacity");
  });

  it("blocks confirmation when eligibility fails at decision time", async () => {
    (
      prismaMock as { voterRecord: { findUnique: jest.Mock } }
    ).voterRecord.findUnique.mockResolvedValue(null);

    const body = {
      decisions: [{ membershipId: MEMBERSHIP_ID, decision: "confirm" }],
    };
    const response = await bulkDecisions(
      createMockRequest(body),
      routeContext(MEETING_ID),
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      results: Array<{ success: boolean; error?: string }>;
    };
    expect(json.results[0].success).toBe(false);
    expect(json.results[0].error).toContain("NOT_REGISTERED");
    expect(getMembershipMock(prismaMock).update).not.toHaveBeenCalled();
  });

  it("returns 404 when meeting does not exist", async () => {
    getMeetingRecordMock(prismaMock).findUnique.mockResolvedValue(null);

    const body = {
      decisions: [{ membershipId: MEMBERSHIP_ID, decision: "confirm" }],
    };
    const response = await bulkDecisions(
      createMockRequest(body),
      routeContext("bad-meeting"),
    );
    await expectErrorResponse(response, 404, "Meeting not found");
  });

  it("returns 422 on invalid payload (empty decisions)", async () => {
    const body = { decisions: [] };
    const response = await bulkDecisions(
      createMockRequest(body),
      routeContext(MEETING_ID),
    );
    await expectErrorResponse(response, 422, "Invalid request data");
  });

  it("returns 422 on duplicate membershipIds", async () => {
    const body = {
      decisions: [
        { membershipId: MEMBERSHIP_ID, decision: "confirm" },
        { membershipId: MEMBERSHIP_ID, decision: "reject" },
      ],
    };
    const response = await bulkDecisions(
      createMockRequest(body),
      routeContext(MEETING_ID),
    );
    await expectErrorResponse(response, 422, "Invalid request data");
  });

  it("handles mixed confirm and reject in single batch", async () => {
    const MEMBERSHIP_ID_2 = "membership-test-id-002";
    getMembershipMock(prismaMock)
      .findUnique.mockResolvedValueOnce(
        createMockMembership({ id: MEMBERSHIP_ID, status: "SUBMITTED" }),
      )
      .mockResolvedValueOnce(
        createMockMembership({ id: MEMBERSHIP_ID_2, status: "SUBMITTED" }),
      );

    const body = {
      decisions: [
        { membershipId: MEMBERSHIP_ID, decision: "confirm" },
        {
          membershipId: MEMBERSHIP_ID_2,
          decision: "reject",
          rejectionNote: "Not eligible",
        },
      ],
    };
    const response = await bulkDecisions(
      createMockRequest(body),
      routeContext(MEETING_ID),
    );
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      results: Array<{
        membershipId: string;
        decision: string;
        success: boolean;
      }>;
    };
    expect(json.results).toHaveLength(2);
    expect(json.results.every((r) => r.success)).toBe(true);
  });
});
