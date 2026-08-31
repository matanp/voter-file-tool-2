/**
 * Tests for GET and POST /api/admin/electionDates.
 * Tested: 401/403 auth (Admin only), success paths, 409 duplicate, 400 invalid date, 500 errors.
 */
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { GET, POST } from "~/app/api/admin/electionDates/route";
import { NextRequest } from "next/server";
import { PrivilegeLevel } from "@prisma/client";
import {
  createMockSession,
  createMockRequest,
  createAuthTestSuite,
  expectAuditLogCreate,
  expectErrorResponse,
  parseJsonResponse,
  type ErrorResponseBody,
  type AuthTestConfig,
} from "../../utils/testUtils";
import { mockAuthSession, mockHasPermission, prismaMock } from "../../utils/mocks";

describe("/api/admin/electionDates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/electionDates", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/admin/electionDates GET",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () =>
          new NextRequest("http://localhost:3000/api/admin/electionDates"),
      };

      const setupMocks = () => {
        prismaMock.electionDate.findMany.mockResolvedValue([]);
      };

      const authTestSuite = createAuthTestSuite(
        authConfig,
        GET,
        mockAuthSession,
        mockHasPermission,
        setupMocks,
      );

      authTestSuite.forEach(({ description, runTest }) => {
        it(description, runTest);
      });
    });

    it("should return election dates on success", async () => {
      const mockDates = [
        { id: 1, date: new Date("2024-11-05") },
        { id: 2, date: new Date("2025-01-01") },
      ];
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.electionDate.findMany.mockResolvedValue(mockDates as never);

      const request = new NextRequest(
        "http://localhost:3000/api/admin/electionDates",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      type ElectionDateItem = { id: number; date: string };
      const json = await parseJsonResponse<ElectionDateItem[]>(response);
      expect(json).toHaveLength(2);
      expect(prismaMock.electionDate.findMany).toHaveBeenCalledWith({
        orderBy: { date: "asc" },
      });
    });

    it("should return 500 on database error", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.electionDate.findMany.mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/admin/electionDates",
      );
      const response = await GET(request);

      await expectErrorResponse(response, 500, "Internal Server Error");
    });
  });

  describe("POST /api/admin/electionDates", () => {
    describe("Authentication tests", () => {
      const authConfig: AuthTestConfig = {
        endpointName: "/api/admin/electionDates POST",
        requiredPrivilege: PrivilegeLevel.Admin,
        mockRequest: () =>
          createMockRequest({ date: "2025-06-15" }),
      };

      const setupMocks = () => {
        prismaMock.electionDate.findFirst.mockResolvedValue(null);
        prismaMock.electionDate.create.mockResolvedValue({
          id: 1,
          date: new Date("2025-06-15"),
        } as never);
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

    it("should create election date and return 201", async () => {
      const newDate = { id: 1, date: new Date("2025-06-15T00:00:00.000Z") };
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.electionDate.findFirst.mockResolvedValue(null);
      prismaMock.electionDate.create.mockResolvedValue(newDate as never);

      const request = createMockRequest({ date: "2025-06-15" });
      const response = await POST(request);

      expect(response.status).toBe(201);
      type CreateElectionDateResponse = { id: number };
      const json =
        await parseJsonResponse<CreateElectionDateResponse>(response);
      expect(json).toMatchObject({ id: 1 });
    });

    it("should return 409 when date already exists", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.electionDate.findFirst.mockResolvedValue({
        id: 1,
        date: new Date("2025-06-15"),
      } as never);

      const request = createMockRequest({ date: "2025-06-15" });
      const response = await POST(request);

      await expectErrorResponse(response, 409, "Election date already exists");
    });

    it("should return 400 for invalid date string", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const request = createMockRequest({ date: "not-a-date" });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await parseJsonResponse<ErrorResponseBody>(response);
      expect(json.error).toBe("Invalid input");
    });

    // The route now shares the strict calendar-date parser: full ISO instants, which the
    // old `Date.parse` path accepted (and its own client used to send), are rejected.
    it("should reject a full ISO instant with 400", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const request = createMockRequest({ date: "2025-06-15T04:00:00.000Z" });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await parseJsonResponse<ErrorResponseBody>(response);
      expect(json.error).toBe("Invalid input");
      expect(prismaMock.electionDate.create).not.toHaveBeenCalled();
    });

    it("should reject a long-form date with 400", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);

      const request = createMockRequest({ date: "November 3, 2026" });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(prismaMock.electionDate.create).not.toHaveBeenCalled();
    });

    it("should accept M/D/YYYY and store UTC midnight for that calendar day", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.electionDate.findFirst.mockResolvedValue(null);
      prismaMock.electionDate.create.mockResolvedValue({
        id: 2,
        date: new Date(Date.UTC(2026, 10, 3)),
      } as never);

      const request = createMockRequest({ date: "11/3/2026" });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prismaMock.electionDate.create).toHaveBeenCalledWith({
        data: { date: new Date(Date.UTC(2026, 10, 3)) },
      });
    });

    it("should match an existing date by UTC day range, not exact instant", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      // A stray non-midnight row for the same calendar day. An equality precheck would
      // miss it and land a silent duplicate; the day-range query reports it as existing.
      prismaMock.electionDate.findFirst.mockResolvedValue({
        id: 7,
        date: new Date("2026-11-03T13:45:00.000Z"),
      } as never);

      const request = createMockRequest({ date: "2026-11-03" });
      const response = await POST(request);

      await expectErrorResponse(response, 409, "Election date already exists");
      expect(prismaMock.electionDate.findFirst).toHaveBeenCalledWith({
        where: {
          date: {
            gte: new Date(Date.UTC(2026, 10, 3)),
            lt: new Date(Date.UTC(2026, 10, 4)),
          },
        },
      });
      expect(prismaMock.electionDate.create).not.toHaveBeenCalled();
    });

    it("writes a fail-open audit row for the created date", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.electionDate.findFirst.mockResolvedValue(null);
      prismaMock.electionDate.create.mockResolvedValue({
        id: 3,
        date: new Date(Date.UTC(2026, 10, 3)),
      } as never);

      const response = await POST(createMockRequest({ date: "2026-11-03" }));

      expect(response.status).toBe(201);
      expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expectAuditLogCreate({
          action: "ELECTION_DATE_CREATED",
          entityType: "ElectionDate",
          entityId: "3",
        }),
      );
    });

    it("still returns 201 when the audit write fails (fail-open)", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.electionDate.findFirst.mockResolvedValue(null);
      prismaMock.electionDate.create.mockResolvedValue({
        id: 3,
        date: new Date(Date.UTC(2026, 10, 3)),
      } as never);
      (prismaMock.auditLog.create as jest.Mock).mockRejectedValue(
        new Error("audit down"),
      );

      const response = await POST(createMockRequest({ date: "2026-11-03" }));

      expect(response.status).toBe(201);
    });

    it("writes no audit row when the date already exists", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.electionDate.findFirst.mockResolvedValue({
        id: 1,
        date: new Date(Date.UTC(2026, 10, 3)),
      } as never);

      const response = await POST(createMockRequest({ date: "2026-11-03" }));

      expect(response.status).toBe(409);
      expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
    });

    it("should return 409 on Prisma P2002 unique constraint violation", async () => {
      mockAuthSession(
        createMockSession({ user: { privilegeLevel: PrivilegeLevel.Admin } }),
      );
      mockHasPermission(true);
      prismaMock.electionDate.findFirst.mockResolvedValue(null);

      // Route checks: error && typeof error === "object" && "code" in error && error.code === "P2002"
      const prismaError = Object.assign(
        new Error("Unique constraint failed"),
        { code: "P2002" },
      );
      prismaMock.electionDate.create.mockRejectedValue(prismaError);

      const request = createMockRequest({ date: "2025-06-15" });
      const response = await POST(request);

      await expectErrorResponse(response, 409, "Election date already exists");
    });
  });
});
