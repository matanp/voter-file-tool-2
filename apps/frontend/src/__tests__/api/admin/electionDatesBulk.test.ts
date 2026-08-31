/**
 * Tests for POST /api/admin/electionDates/bulk.
 *
 * Tested: Admin-only auth gating, happy path (including the `M/D/YYYY` vs `YYYY-MM-DD`
 * timezone trap), the 50-row cap, the audit row, UTC-day matching against existing rows,
 * and the race in which a row passes the precheck but collides at the DB. There is no
 * transaction-rollback test: with `skipDuplicates` and fail-open audit logging, no
 * rollback path remains (spec §Tests).
 */
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { POST } from "~/app/api/admin/electionDates/bulk/route";
import { PrivilegeLevel } from "@prisma/client";
import { MAX_BULK_ROWS } from "~/lib/electionConfigParsing";
import {
  createMockSession,
  createMockRequest,
  createAuthTestSuite,
  expectAuditLogCreate,
  parseJsonResponse,
  type ErrorResponseBody,
  type AuthTestConfig,
} from "../../utils/testUtils";
import {
  mockAuthSession,
  mockHasPermission,
  prismaMock,
} from "../../utils/mocks";

type ElectionDateRecord = { id: number; date: string };
type BulkResponse = { created: ElectionDateRecord[]; skipped: string[] };

const electionDateMock = () =>
  prismaMock.electionDate as unknown as {
    findMany: jest.Mock;
    createManyAndReturn: jest.Mock;
  };

const asAdmin = () => {
  mockAuthSession(
    createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
  );
  mockHasPermission(true);
};

describe("POST /api/admin/electionDates/bulk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication tests", () => {
    const authConfig: AuthTestConfig = {
      endpointName: "/api/admin/electionDates/bulk POST",
      requiredPrivilege: PrivilegeLevel.Admin,
      mockRequest: () => createMockRequest({ dates: ["2026-11-03"] }),
    };

    const setupMocks = () => {
      electionDateMock().findMany.mockResolvedValue([]);
      electionDateMock().createManyAndReturn.mockResolvedValue([
        { id: 1, date: new Date(Date.UTC(2026, 10, 3)) },
      ]);
    };

    const authTestSuite = createAuthTestSuite(
      authConfig,
      POST,
      mockAuthSession,
      mockHasPermission,
      setupMocks,
      201,
    );

    authTestSuite.forEach(({ description, runTest }) => {
      it(description, runTest);
    });
  });

  it("creates both accepted formats at UTC midnight and dedupes by day", async () => {
    asAdmin();
    electionDateMock().findMany.mockResolvedValue([]);
    electionDateMock().createManyAndReturn.mockResolvedValue([
      { id: 1, date: new Date(Date.UTC(2026, 10, 3)) },
      { id: 2, date: new Date(Date.UTC(2026, 5, 23)) },
    ]);

    const request = createMockRequest({
      dates: ["11/3/2026", "2026-06-23", "2026-11-03"],
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const json = await parseJsonResponse<BulkResponse>(response);
    expect(json.created).toHaveLength(2);
    // The third line is the same calendar day as the first, written the other way.
    expect(json.skipped).toEqual(["2026-11-03"]);

    // Both formats land on the same UTC-midnight instant — no off-by-one day.
    expect(electionDateMock().createManyAndReturn).toHaveBeenCalledWith({
      data: [
        { date: new Date(Date.UTC(2026, 10, 3)) },
        { date: new Date(Date.UTC(2026, 5, 23)) },
      ],
      skipDuplicates: true,
    });
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it("prechecks existing rows by UTC day range, not exact instant", async () => {
    asAdmin();
    // A stray non-midnight row for the same calendar day. Equality matching would miss
    // it and land a silent duplicate; the day range reports it as already existing.
    electionDateMock().findMany.mockResolvedValue([
      { id: 7, date: new Date("2026-11-03T13:45:00.000Z") },
    ]);

    const response = await POST(createMockRequest({ dates: ["2026-11-03"] }));

    expect(response.status).toBe(201);
    const json = await parseJsonResponse<BulkResponse>(response);
    expect(json.created).toEqual([]);
    expect(json.skipped).toEqual(["2026-11-03"]);
    expect(electionDateMock().findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            date: {
              gte: new Date(Date.UTC(2026, 10, 3)),
              lt: new Date(Date.UTC(2026, 10, 4)),
            },
          },
        ],
      },
    });
    expect(electionDateMock().createManyAndReturn).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it("writes one fail-open audit row for the batch", async () => {
    asAdmin();
    electionDateMock().findMany.mockResolvedValue([]);
    electionDateMock().createManyAndReturn.mockResolvedValue([
      { id: 1, date: new Date(Date.UTC(2026, 10, 3)) },
    ]);

    const response = await POST(createMockRequest({ dates: ["2026-11-03"] }));

    expect(response.status).toBe(201);
    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expectAuditLogCreate({
        action: "ELECTION_DATES_BULK_CREATED",
        entityType: "ElectionDate",
        entityId: expect.stringMatching(/^bulk-\d+$/) as unknown as string,
        metadata: { createdCount: 1, skippedCount: 0 },
      }),
    );
  });

  it("still returns 201 when the audit write fails (fail-open)", async () => {
    asAdmin();
    electionDateMock().findMany.mockResolvedValue([]);
    electionDateMock().createManyAndReturn.mockResolvedValue([
      { id: 1, date: new Date(Date.UTC(2026, 10, 3)) },
    ]);
    (prismaMock.auditLog.create as jest.Mock).mockRejectedValue(
      new Error("audit down"),
    );

    const response = await POST(createMockRequest({ dates: ["2026-11-03"] }));

    expect(response.status).toBe(201);
  });

  it("rejects more than MAX_BULK_ROWS dates with 400", async () => {
    asAdmin();
    const dates = Array.from(
      { length: MAX_BULK_ROWS + 1 },
      (_, i) => `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
    );

    const response = await POST(createMockRequest({ dates }));

    expect(response.status).toBe(400);
    const json = await parseJsonResponse<ErrorResponseBody>(response);
    expect(json.error).toBe("Invalid input");
    expect(electionDateMock().createManyAndReturn).not.toHaveBeenCalled();
  });

  it.each([
    ["a full ISO instant", "2026-11-03T00:00:00.000Z"],
    ["a long form date", "November 3, 2026"],
    ["a date that does not round-trip", "2026-02-30"],
  ])("rejects %s with 400", async (_label, value) => {
    asAdmin();

    const response = await POST(
      createMockRequest({ dates: ["2026-11-03", value] }),
    );

    expect(response.status).toBe(400);
    expect(electionDateMock().createManyAndReturn).not.toHaveBeenCalled();
  });

  it("reports a row that loses the insert race as skipped, not failed", async () => {
    asAdmin();
    electionDateMock().findMany.mockResolvedValue([]);
    // 2026-06-23 passed the precheck but was inserted concurrently; `skipDuplicates`
    // drops it at the DB and it simply comes back absent from `created`.
    electionDateMock().createManyAndReturn.mockResolvedValue([
      { id: 1, date: new Date(Date.UTC(2026, 10, 3)) },
    ]);

    const response = await POST(
      createMockRequest({ dates: ["2026-11-03", "2026-06-23"] }),
    );

    expect(response.status).toBe(201);
    const json = await parseJsonResponse<BulkResponse>(response);
    expect(json.created).toHaveLength(1);
    expect(json.skipped).toEqual(["2026-06-23"]);
    expect(json).not.toHaveProperty("failed");
  });

  it("returns 500 on an unexpected database error", async () => {
    asAdmin();
    electionDateMock().findMany.mockRejectedValue(new Error("Database error"));

    const response = await POST(createMockRequest({ dates: ["2026-11-03"] }));

    expect(response.status).toBe(500);
  });
});
