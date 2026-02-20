/**
 * SRS 2.6 — API tests for POST /api/admin/petition-outcomes/record.
 */

import { POST } from "~/app/api/admin/petition-outcomes/record/route";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockRequest,
  expectSuccessResponse,
  expectErrorResponse,
  expectAuditLogCreate,
  expectMembershipCreate,
  expectMembershipUpdate,
  DEFAULT_ACTIVE_TERM_ID,
  getMembershipMock,
  getAuditLogMock,
} from "../../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../../utils/mocks";

const SEAT_ID = "seat-1";

function createValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    committeeListId: 1,
    seatNumber: 1,
    primaryDate: "2024-09-15",
    candidates: [
      { voterRecordId: "V1", voteCount: 10, outcome: "WON_PRIMARY" as const },
      { voterRecordId: "V2", voteCount: 5, outcome: "LOST_PRIMARY" as const },
    ],
    ...overrides,
  };
}

function setupSeatAndNoHolder() {
  (prismaMock.seat as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
    id: SEAT_ID,
    committeeListId: 1,
    termId: DEFAULT_ACTIVE_TERM_ID,
    seatNumber: 1,
    isPetitioned: false,
  });
  getMembershipMock(prismaMock).findFirst.mockResolvedValue(null);
}

function setupNoExistingMemberships() {
  getMembershipMock(prismaMock).findUnique.mockResolvedValue(null);
}

function setupTransactionMocks() {
  (prismaMock.seat as { update: jest.Mock }).update.mockResolvedValue({});
  getMembershipMock(prismaMock).create.mockResolvedValue({
    id: "mem-1",
    voterRecordId: "V1",
    committeeListId: 1,
    termId: DEFAULT_ACTIVE_TERM_ID,
    status: "ACTIVE",
  });
  getMembershipMock(prismaMock).update.mockResolvedValue({});
  getAuditLogMock(prismaMock).create.mockResolvedValue({});
}

describe("POST /api/admin/petition-outcomes/record", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthSession(
      createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
    );
    mockHasPermission(true);
    setupSeatAndNoHolder();
    setupNoExistingMemberships();
    setupTransactionMocks();
  });

  it("returns 422 when no winner and not all tie", async () => {
    const body = createValidPayload({
      candidates: [
        { voterRecordId: "V1", outcome: "LOST_PRIMARY" },
        { voterRecordId: "V2", outcome: "LOST_PRIMARY" },
      ],
    });
    const response = await POST(createMockRequest(body));
    await expectErrorResponse(response, 422, "Invalid request data");
    expect(prismaMock.seat?.findUnique).not.toHaveBeenCalled();
  });

  it("returns 422 when two winners", async () => {
    const body = createValidPayload({
      candidates: [
        { voterRecordId: "V1", outcome: "WON_PRIMARY" },
        { voterRecordId: "V2", outcome: "WON_PRIMARY" },
      ],
    });
    const response = await POST(createMockRequest(body));
    await expectErrorResponse(response, 422, "Invalid request data");
  });

  it("returns 422 when duplicate candidate voterRecordIds", async () => {
    const body = createValidPayload({
      candidates: [
        { voterRecordId: "V1", outcome: "WON_PRIMARY" },
        { voterRecordId: "V1", outcome: "LOST_PRIMARY" },
      ],
    });
    const response = await POST(createMockRequest(body));
    await expectErrorResponse(response, 422, "Invalid request data");
  });

  it("returns 422 when candidates array is empty", async () => {
    const body = createValidPayload({ candidates: [] });
    const response = await POST(createMockRequest(body));
    await expectErrorResponse(response, 422, "Invalid request data");
  });

  it("returns 404 when seat does not exist", async () => {
    (prismaMock.seat as { findUnique: jest.Mock }).findUnique.mockResolvedValue(null);
    const response = await POST(createMockRequest(createValidPayload()));
    await expectErrorResponse(
      response,
      404,
      "Seat not found for this committee and term",
    );
  });

  it("returns 409 when seat is occupied by another member", async () => {
    getMembershipMock(prismaMock).findFirst.mockResolvedValue({
      voterRecordId: "OTHER",
    });
    const response = await POST(createMockRequest(createValidPayload()));
    await expectErrorResponse(
      response,
      409,
      "Seat is already occupied by another member; resolve before recording petition outcome",
    );
  });

  it("records outcome and sets winner ACTIVE with seat, losers PETITIONED_LOST", async () => {
    const body = createValidPayload();
    const response = await POST(createMockRequest(body));

    await expectSuccessResponse(
      response,
      { message: "Petition outcome recorded", seatNumber: 1 },
      200,
    );

    expect(prismaMock.seat?.findUnique).toHaveBeenCalledWith({
      where: {
        committeeListId_termId_seatNumber: {
          committeeListId: 1,
          termId: DEFAULT_ACTIVE_TERM_ID,
          seatNumber: 1,
        },
      },
    });

    const seatUpdate = (prismaMock.seat as { update: jest.Mock }).update;
    expect(seatUpdate).toHaveBeenCalledWith({
      where: { id: SEAT_ID },
      data: { isPetitioned: true },
    });

    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({ action: "PETITION_RECORDED" }),
    );
    expect(getAuditLogMock(prismaMock).create).toHaveBeenCalledWith(
      expectAuditLogCreate({ action: "MEMBER_ACTIVATED" }),
    );
  });

  it("records unopposed winner as ACTIVE", async () => {
    const body = createValidPayload({
      candidates: [
        { voterRecordId: "V1", voteCount: 1, outcome: "UNOPPOSED" },
      ],
    });
    const response = await POST(createMockRequest(body));

    await expectSuccessResponse(
      response,
      { message: "Petition outcome recorded", seatNumber: 1 },
      200,
    );

    expect(getMembershipMock(prismaMock).create).toHaveBeenCalledWith(
      expectMembershipCreate({
        status: "ACTIVE",
        seatNumber: 1,
        membershipType: "PETITIONED",
        petitionSeatNumber: 1,
      }),
    );
  });

  it("records tie as PETITIONED_TIE with null seatNumber", async () => {
    const body = createValidPayload({
      candidates: [
        { voterRecordId: "V1", voteCount: 5, outcome: "TIE" },
        { voterRecordId: "V2", voteCount: 5, outcome: "TIE" },
      ],
    });
    const response = await POST(createMockRequest(body));

    await expectSuccessResponse(
      response,
      { message: "Petition outcome recorded", seatNumber: 1 },
      200,
    );

    const createCalls = getMembershipMock(prismaMock).create.mock.calls;
    expect(createCalls.length).toBe(2);
    createCalls.forEach((call: unknown[]) => {
      const arg = (call as [{ data: { status: string; seatNumber: number | null } }])[0];
      expect(arg.data.status).toBe("PETITIONED_TIE");
      expect(arg.data.seatNumber).toBeNull();
    });
  });

  it("updates existing membership when candidate already has membership", async () => {
    getMembershipMock(prismaMock).findUnique
      .mockResolvedValueOnce({
        id: "existing-1",
        voterRecordId: "V1",
        status: "SUBMITTED",
      })
      .mockResolvedValueOnce({
        id: "existing-2",
        voterRecordId: "V2",
        status: "SUBMITTED",
      });

    const body = createValidPayload();
    const response = await POST(createMockRequest(body));

    await expectSuccessResponse(
      response,
      { message: "Petition outcome recorded", seatNumber: 1 },
      200,
    );

    expect(getMembershipMock(prismaMock).update).toHaveBeenCalled();
    expect(getMembershipMock(prismaMock).update).toHaveBeenCalledWith(
      expectMembershipUpdate(
        {
          status: "ACTIVE",
          seatNumber: 1,
          membershipType: "PETITIONED",
          petitionSeatNumber: 1,
        },
        { id: "existing-1" },
      ),
    );
  });
});
